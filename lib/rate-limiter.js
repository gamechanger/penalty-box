async = require('async');
var lua = require('./lua');
var redis = require('./redis-client');

weekInSeconds = 60 * 60 * 24 * 7;

/**
 * ensureString
 * Check to make sure string value exists at key. If not the key is added with def value
 * @param {string} key Key under which the string should live
 * @param {string} def Value to store if the key is not initialized
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err)
 */
ensureString = function(key, def, client, callback) {
    client.exists(key, function(err, res){
        if (err) {return callback(err);}
        if (res == 0) {
            return client.setex(key, weekInSeconds, def, function(err, res) {
                if (err) {return callback(err);}
                return callback();
            });
        }
        return callback();
    });
};

/**
 * rateLimterBaseName
 * This functions takes the app and the key and returns back the base_name for the keys
 * @param {string} appName
 * @param {string} key
 */
rateLimterBaseName = function(appName, key){
    return appName + ":" + key;
}

/**
 * rateLimitKey
 * This takes an app name and a key and returns the redis key to store the max rate limit under
 * @param {string} appName
 * @param {string} key
 */
 rateLimitKey = function(appName, key){
    return rateLimterBaseName(appName, key) + "_rl";
 }

/**
 * epochMsKey
 * This takes an app name and a key and returns the redis key to store the epoch_ms under
 * @param {string} appName
 * @param {string} key
 */
 epochMsKey = function(appName, key){
    return rateLimterBaseName(appName, key) + "_epoch_ms";
 }

/**
 * tokensKey
 * This takes an app name and a key and returns the redis key to store the tokens under
 * @param {string} appName
 * @param {string} key
 */
 tokensKey = function(appName, key){
    return rateLimterBaseName(appName, key) + "_tkns";
 }

/**
 * keyToken
 * Given an app and key, this function will return the token the key in the app has left
 * @param {string} appName The name of the app you want to retrieve the apps from
 * @param {string} key The key the app is looking to rate limit on
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err, response) response is the # of tokens left
 */
exports.keyToken = function(appName, key, client, callback){
    client.get(tokensKey(appName, key), function(err, res){
        if (err){return callback(err);}
        if (res != null){
            res = parseInt(res);
        }
        return callback(null, res);
    });
};

/**
 * rateLimit
 * Given an app and key, this function will return the number of requests allowed per hour
 * @param {string} appName The name of the app you want to retrieve the apps from
 * @param {string} key The key the app is looking to rate limit on
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err, response) response is the # tokens allowed per hour
 */
exports.rateLimit = function(appName, key, client, callback){
    client.get(rateLimitKey(appName, key), function(err, res){
        if (err){return callback(err);}
        if (res != null){
            res = parseInt(res);
        }
        return callback(null, res);
    });
};

/**
 * epochMs
 * Given an app and key, this function will return the epoch in ms currently set for the key
 * @param {string} appName The name of the app you want to retrieve the apps from
 * @param {string} key The key the app is looking to rate limit on
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err, response) response is the epoch in ms
 */
exports.epochMs = function(appName, key, client, callback){
    client.get(epochMsKey(appName, key), function(err, res){
        if (err){return callback(err);}
        if (res != null){
            res = parseInt(res);
        }
        return callback(null, res);
    });
};


/**
 * isRateLimited
 * Given an app and key, this function will return whether or not the key is currently rate limited
 * @param {string} appName The name of the app you want to retrieve the apps from
 * @param {string} key The key the app is looking to rate limit on
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err, response) response is a boolean that indicates if app is rate limited
 */
exports.isRateLimited = function(appName, key, client, callback) {
    client.get(rateLimitKey(appName, key), function(err, res){
        rateLimited = false;
        if (err){return callback(err);}
        if (res != null){
            rateLimited = parseInt(res) > 0;
        }
        return callback(null, rateLimited);
    });
}
/**
 * rateLimitAppKey
 * This function uses a lua script to check if more tokens needs to be added, adds them, and then checks if a request
 * with a certain cost is allowed
 * @param {string} appName The name of the app you want to retrieve the apps from
 * @param {string} key The key the app is looking to rate limit on
 * @param {integer} cost How many tokens this request costs
 * @param {integer} rateLimit How many requests per time period this key should get
 * @param {integer} rateLimitPeriodMs Time period (in miliseconds) that rateLimit is enforced for. After 
 * rateLimitPeriodMs, rate limit for key pair will be reset to rateLimit
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err, response) response consists of 4 values
 *      1. returnStatus: -1 is failure and 0 is success
 *      2. currentTokens: number of tokens a requester has left
 *      3. currentEpoch:  current stored epoch. The time in miliseconds till the rateLimit is reset is stored
 *      4. currentRateLimit: rate limit stored in the key value store
 */
exports.rateLimitAppKey = function(appName, key, cost, rateLimit, rateLimitPeriodMs, client, callback){
    async.waterfall([
        function(cb) { return redis.ensureScript(client, lua.perform_rate_limiting, cb); },
        function(cb) {
            d = new Date();
            currentEpoch = d.getTime();
            return client.evalsha(redis.getScriptSha1(lua.perform_rate_limiting),
                                  3,
                                  rateLimitKey(appName, key),
                                  tokensKey(appName, key),
                                  epochMsKey(appName, key),
                                  currentEpoch,
                                  cost,
                                  rateLimit,
                                  rateLimitPeriodMs,
                                  weekInSeconds,
                                  function(err, returnVals) {
                                      if (err) {
                                          console.log("Got an error back from perform_rate_limiting lua script")
                                          console.log(err)
                                          return cb(err);
                                      }
                                      return cb(null, returnVals);
                                  });
        }
  ], callback);
};
