'use strict';

module.exports = streamReduce;

var EventEmitter = require('events').EventEmitter;
var cpus = require('os').cpus().length;
var vm = require('vm');
var fs = require('fs');
var fork = require('child_process').fork;
var path = require('path');
var binarysplit = require('binary-split');
// var cover = require('./cover');
var streamArray = require('stream-array');
// var MBTiles = require('@mapbox/mbtiles');
var through = require('through2');

// Suppress max listener warnings. We need at least 1 listener per worker.
process.stderr.setMaxListeners(0);

function streamReduce(options) {

  var ee = new EventEmitter();
  var workers = ee.workers = [];
  var workersReady = 0;
  var maxWorkers = Math.min(cpus, options.maxWorkers || cpus);
  var output = options.output || process.stdout;

  var lineStream = null;
  var linesDone = 0;
  var linesSent = 0;
  var pauseLimit = options.batch || 5000;
  var start = Date.now();
  var timer;

  // Validate syntax in the map script to fail faster
  try {
    new vm.Script(fs.readFileSync(options.map), {filename: options.map}); // eslint-disable-line
  } catch (e) {
    if (e instanceof SyntaxError) {
      e.message = 'Found a syntax error in your map script: ' + options.map + '\n\n' + e.message;
      throw e;
    } else if (e instanceof Error) {
      e.message = 'Unable to find or require your map script: ' + options.map + '\n\n' + e.message;
      throw e;
    }
  }

  log('Starting up ' + maxWorkers + ' workers... ');

  if (output) output.setMaxListeners(0);
  var mapOptions = options.mapOptions || {};

  for (var i = 0; i < maxWorkers; i++) {
    var worker = fork(path.join(__dirname, 'worker.js'), [options.map, 1, JSON.stringify(mapOptions)], {silent: true});
    worker.stdout.pipe(binarysplit('\x1e')).pipe(output);
    worker.stderr.pipe(process.stderr);
    worker.on('message', handleMessage);
    workers.push(worker);
  }

  function handleMessage(message) {
    if (message.reduce) reduce(message.value, message.tile);
    else if (message.ready && ++workersReady === workers.length) run();
  }

  function run() {
    log('Job started.\n');

    ee.emit('start');
    timer = setInterval(updateStatus, 64);

    // var tiles = cover(options);

    // if (tiles) {
    //   // JS tile array, GeoJSON or bbox
    //   log('Processing ' + tiles.length + ' tiles.\n');
    //   lineStream = streamArray(tiles)
    //     .on('data', handleTile)
    //     .on('end', streamEnded);
    //
    // } else
    if (options.lineStream) {
      log('Processing lines from stream.\n');
      lineStream = options.lineStream;
      lineStream
        .on('data', handleLine)
        .on('end', streamEnded)
        .resume();
      }
    // } else {
    //   // try to get tiles from mbtiles (either specified by sourceCover or first encountered)
    //   var source;
    //   for (var i = 0; i < options.sources.length; i++) {
    //     source = options.sources[i];
    //     if (options.sources[i].mbtiles && (!options.sourceCover || options.sourceCover === source.name)) break;
    //     source = null;
    //   }
    //   if (source) {
    //     log('Processing tile coords from "' + source.name + '" source.\n');
    //     var db = new MBTiles(source.mbtiles, function(err) {
    //       if (err) throw err;
    //       lineStream = db.createZXYStream()
    //         .pipe(binarysplit('\n'))
    //         .on('data', handleZXYLine)
    //         .on('end', streamEnded);
    //     });
    //
    //   } else {
    //     throw new Error(options.sourceCover ?
    //       'Specified source for cover not found.' :
    //       'No area or tiles specified for the job.');
    //   }
    // }
  }

  var paused = false;
  var ended = false;

  function streamEnded() {
    ended = true;
    if (linesDone === linesSent) shutdown();
  }

  function handleLine(line) {
    // console.warn(tile)
    line = line.toString();
    var workerId = linesSent++ % workers.length;
    ee.emit('map', line, workerId);
    workers[workerId].send(line);
    if (!paused && linesSent - linesDone > pauseLimit) {
      paused = true;
      lineStream.pause();
    }
  }

  // function handlelineStreamLine(line) {
  //   var tile = line;
  //   if (typeof line === 'string' || line instanceof Buffer) {
  //     tile = line.toString().split(' ');
  //   }
  //   handleTile(tile.map(Number));
  // }

  // function handleZXYLine(line) {
  //   var tile = line.toString().split('/');
  //   handleTile([+tile[1], +tile[2], +tile[0]]);
  // }

  function reduce(value, line) {
    if (value !== null && value !== undefined) ee.emit('reduce', value, line);
    if (paused && linesSent - linesDone < (pauseLimit / 2)) {
      paused = false;
      lineStream.resume();
    }
    if (++linesDone === linesSent && ended) shutdown();
  }

  function shutdown() {
    while (workers.length) workers.pop().kill('SIGHUP');

    clearTimeout(timer);
    updateStatus();
    log('.\n');

    ee.emit('end');
  }

  /* istanbul ignore next */
  function updateStatus() {
    if (options.log === false || !process.stderr.cursorTo) return;

    var s = Math.floor((Date.now() - start) / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s - h * 3600) / 60);
    var time = (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + (s % 60) + 's';

    process.stderr.cursorTo(0);
    process.stderr.write(linesDone + ' lines processed in ' + time);
    process.stderr.clearLine(1);
  }

  /* istanbul ignore next */
  function log(str) {
    if (options.log !== false) process.stderr.write(str);
  }

  return ee;
}
