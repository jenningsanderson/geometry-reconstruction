'use strict';

var queue = require('queue-async');
var q = queue();
var sources = [];
var linesQueue = queue(1);
var isOldNode = process.versions.node.split('.')[0] < 4;

global.mapOptions = JSON.parse(process.argv[3]);
var map = require(process.argv[2]);

q.awaitAll(function(err, results) {
  if (err) throw err;
  process.send({ready: true});
});

function processLine(line, callback) {
  var q = queue();

  q.awaitAll(gotData);

  function gotData(err, results) {
    if (err) throw err;

    var writeQueue = queue(1);

    function write(data) {
      writeQueue.defer(writeStdout, (typeof data !== 'string' ? JSON.stringify(data) : data) + '\x1e');
    }

    function gotResults(err, value) {
      if (err) throw err;
      writeQueue.awaitAll(function() {
        process.send({reduce: true, value: value, line: line}, null, callback);
        if (isOldNode) callback(); // process.send is async since Node 4.0
      });
    }

    map(line, write, gotResults);
  }
}

function writeStdout(str, cb) {
  process.stdout.write(str, cb);
}

process.on('message', function(line) {
  linesQueue.defer(processLine, line);
});
