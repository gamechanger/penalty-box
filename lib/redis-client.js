var config = require('./config');
var redisClient = require('redis').createClient(config.redis_port, config.redis_host);

var loadedScriptStrings = {};

exports.client = redisClient;

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
