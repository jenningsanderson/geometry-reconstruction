'use strict';

module.exports = function(data, tile, writeData, done) {
  console.log(JSON.stringify(data));
  done(null, 1);
}
