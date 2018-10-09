'use strict';

var streamReduce = require('./src');
var path         = require('path');
var fs           = require('fs');
var split        = require('binary-split');

var lines = 0;
streamReduce({
  map: path.join(__dirname, 'map-geom-reconstruction.js'),
  sources: [{name: 'osm', mbtiles: path.join(__dirname, 'tmp.mbtiles'), raw: true}],
  maxWorkers:2,
  lineStream: fs.createReadStream(path.join(__dirname, 'stream.lines')).pipe(split())
})
.on('reduce', function(num) {
  lines += num;
})
.on('end', function() {
  console.log("DONE", lines)
});


// tileReduce({
//   bbox: [-122.05862045288086, 36.93768132842635, -121.97296142578124, 37.00378647456494],
//   zoom: 15,
//   map: path.join(__dirname, '/count.js'),
//   sources: [{name: 'osm', mbtiles: path.join(__dirname, '../../test/fixtures/osm.mbtiles'), raw: true}]
// })
