'use strict';

var test = require('tap').test;
var remote = require('../src/remote');
var fs = require('fs');
var path = require('path');

test('remote - raw parse', function(t) {
  var osmUrl = 'https://b.tiles.mapbox.com/v4/morganherlocker.3vsvfjjw/{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ';
  var source = {name: 'osm', url: osmUrl};
  var getTile = remote(source, function() {});

  getTile([5276, 12757, 15], function(err, layers) {
    t.notOk(err, 'remote VT unpacked without error');
    t.ok(layers, 'layers parsed from remote source');
    t.equal(
      JSON.stringify(layers),
      fs.readFileSync(path.join(__dirname, '/fixtures/osm-raw-parsed.json'), 'utf8'),
      'osm remote VT matches test fixture');
    t.end();
  });
});

test('remote - init', function(t) {
  var osmUrl = 'https://b.tiles.mapbox.com/v4/morganherlocker.3vsvfjjw/{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ';
  var source = {name: 'osm', url: osmUrl};

  remote(source, function(err) {
    t.notOk(err, 'remote getTile init without error');
    t.end();
  });
});

test('remote - raw invalid url - 401', function(t) {
  var badUrl = 'https://b.tiles.mapbox.com/v4/morganherlocker.3vsvfjjw/{z}/{x}.vector.pbf';
  var source = {name: 'osm', url: badUrl};
  var getTile = remote(source, function() {});

  getTile([5276, 12757, 15], function(err, layers) {
    t.ok(err, 'returns an error with a bad remote url');
    t.equal(err.message, 'Server responded with status code 401', '401 error');
    t.notOk(layers, 'does not return layers with a bad remote url');
    t.end();
  });
});

test('remote - raw invalid url - no server', function(t) {
  var badUrl = 'https://tiles.mapox.com/v4/morganherlocker.3vsvfjjw/{z}/{x}.vector.pbf';
  var source = {name: 'osm', url: badUrl};
  var getTile = remote(source, function() {});

  getTile([5276, 12757, 15], function(err, layers) {
    t.ok(err, 'returns an error with a bad remote url');
    t.equal(err.message, 'getaddrinfo ENOTFOUND', 'HTTP address not found');
    t.notOk(layers, 'does not return layers with a bad remote url');
    t.end();
  });
});