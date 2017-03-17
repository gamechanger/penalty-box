var config = require('./config');
var redisClient = require('redis').createClient(config.redis_port, config.redis_host);

var loadedScriptStrings = {};

redisClient.on('error', function(err) {
    console.log('Redis error: ' + err);
});

exports.ensureScript = function(client, scriptString, cb) {
  if (scriptString in loadedScriptStrings) { return cb(); }
  client.script('load', scriptString, function(err, sha1) {
    if (err) { return cb(err); }
    loadedScriptStrings[scriptString] = sha1;
    return cb();
  });
};

exports.getScriptSha1 = function(scriptString) {
  return loadedScriptStrings[scriptString];
};

exports.client = redisClient;
