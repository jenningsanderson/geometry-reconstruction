'use strict';

module.exports = streamReduce;

var EventEmitter = require('events').EventEmitter;
var cpus         = require('os').cpus().length;
var vm           = require('vm');
var fs           = require('fs');
var fork         = require('child_process').fork;
var path         = require('path');
var streamArray  = require('stream-array');
var split        = require('binary-split');

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
    var worker = fork(path.join(__dirname, 'worker.js'), [options.map, JSON.stringify(mapOptions)], {silent: true});
    worker.stdout.pipe(split('\x1e')).pipe(output);
    worker.stderr.pipe(process.stderr);
    worker.on('message', handleMessage);
    workers.push(worker);
  }

  function handleMessage(message) {
    if (message.reduce) reduce(message.value, message.line);
    else if (message.ready && ++workersReady === workers.length) run();
  }

  function run() {
    log('Job started.\n');

    ee.emit('start');
    timer = setInterval(updateStatus, 100);

    log('Processing lines from file: '+ options.file +'\n');
    lineStream = fs.createReadStream(options.file).pipe(split())

    lineStream
      .on('data', handleLine)
      .on('end', streamEnded)
      .resume();
  }

  var paused = false;
  var ended = false;

  function streamEnded() {
    ended = true;
    if (linesDone === linesSent) shutdown();
  }

  function handleLine(line) {
    line = line.toString();
    var workerId = linesSent++ % workers.length;
    ee.emit('map', line, workerId);
    workers[workerId].send(line);
    if (!paused && linesSent - linesDone > pauseLimit) {
      paused = true;
      lineStream.pause();
    }
  }

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

  function log(str) {
    if (options.log !== false) process.stderr.write(str);
  }

  return ee;
}
