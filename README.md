# JSON-Stream-Reduce

This is a simplified framework built off Mapbox's [tile-reduce](//github.com/mapbox/tile-reduce) to perform map-reduce functions against large files of line-delimited JSON. This simply removes all of the `tile` processing and instead passes each new line in the file to the map script.

This is currently used for geometry-reconstruction of historical OpenStreetMap objects as output from the [OSM-Wayback](//github.com/osmlab/osm-wayback) utility

### Install

    npm install json-stream-reduce

### Example Implementation

#### File: `example/index.js`

    var count = 0;

    streamReduce({
      map: path.join(__dirname, 'map.js'),             //Map function
      file: path.join(__dirname, 'file.jsonseq'),      //Input file (lines of JSON)
      maxWorkers:10 // The number of cpus you'd like to use
    })
    .on('reduce', function(res) {
      count+=res
    })
    .on('end', function() {
      console.log("Finished with count value: "+count)
    });

#### File: `example/map.js`

    module.exports = function(line, writeData, done) {
      var object = JSON.parse(line.toString());
      done(object.count)
    })

#### file.jsonseq

	{"count":10}
	{"count":10}
	{"count":10}
	{"count":10}
	{"count":10}

#### Use
	$ node examples/index.js

	>>Starting up 2 workers... Job started.
	>>Processing lines from file: examples/file.jsonseq
	>>5 lines processed in 0s.
	>>Finished, value of count: 50
