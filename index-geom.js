'use strict';

var streamReduce = require('./src');
var path         = require('path');
var fs           = require('fs');
var split        = require('binary-split');

var lines = 0;
streamReduce({
  map: path.join(__dirname, 'geometry-reconstruction/map-geom-reconstruction.js'),
  // sources: [{name: 'osm', mbtiles: path.join(__dirname, 'tmp.mbtiles'), raw: true}],
  maxWorkers:2,
  lineStream: fs.createReadStream(path.join(__dirname, 'test/tampa-test.history.geometries.head')).pipe(split())
})
.on('reduce', function(num) {
  lines += num;
})
.on('end', function() {
  console.log("DONE", lines)
});
