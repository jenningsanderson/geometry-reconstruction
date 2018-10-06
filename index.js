'use strict';

var streamReduce = require('./src');
var path         = require('path');
var fs           = require('fs');
var split        = require('split');

var lines = 0;
streamReduce({
  map: path.join(__dirname, 'map-geom-reconstruction.js'),
  input: undefined,
  maxWorkers:2
})
.on('reduce', function(num) {
  lines += num;
})
.on('end', function() {
  console.log("DONE")
  console.log(lines)
});
