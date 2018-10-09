var streamReduce = require('../src');
var path = require('path')

var count = 0;

streamReduce({
  map: path.join(__dirname, 'map.js'),
  file: path.join(__dirname, 'file.jsonseq'),
  maxWorkers:5 // The number of cpus you'd like to use
})
.on('reduce', function(res) {
  count+=res
})
.on('end', function() {
  console.log("Finished, value of count: "+count)
});
