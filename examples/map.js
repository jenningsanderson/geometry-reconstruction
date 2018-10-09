'use strict';

module.exports = function(line, writeData, done) {

  var object = JSON.parse(line.toString());

  done(null, object.count)
}
