'use strict';

module.exports = function(line, writeData, done) {

  // var features = data.osm.polies_4326.length

  var features = 1;

  writeData(JSON.stringify(line) + " " +features+"\n")

  done(null, features);
}
