async = require('async');
var lua = require('./lua');
var redis = require('./redis-client');
var client = redis.client;

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
 * ensureAppAndKey
 * Check to make sure both the app and the key passed in have the required rate
 * limiter structures set up
 * @param {string} appName The appName that should have a set of RL redis structs set up
 * @param {string} key The key the app is looking to rate limit on
 * @param {int} rateLimit The rateLimit to set up for this key
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err)
 */
exports.ensureAppAndKey = function(appName, key, rateLimit, client, callback){
    async.waterfall([
        function(cb) { return redis.ensureScript(client, lua.ensure_rate_limiting_setup, cb); },
        function(cb) {
            d = new Date();
            currentEpoch = d.getTime();
            return client.eval(lua.ensure_rate_limiting_setup,
                        3,
                        rateLimitKey(appName, key),
                        tokensKey(appName, key),
                        epochMsKey(appName, key),
                        currentEpoch,
                        rateLimit,
                        weekInSeconds,
                        function(err, returnVals) {
                            if (err) {
                                console.log("Got an error back from ensure_rate_limiting_setup lua script")
                                console.log(err)
                                return cb(err);
                            }
                            return cb();
                        });
        }
  ], callback);
};

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
 * rateLimitAppKey
 * This function uses a lua script to check if more tokens needs to be added, adds them, and then checks if a request
 * with a certain cost is allowed
 * @param {string} appName The name of the app you want to retrieve the apps from
 * @param {string} key The key the app is looking to rate limit on
 * @param {integer} cost How many tokens this request costs
 * @param {function} callback signature (err, response) response is the amount of tokens left. -1 means that the request was disallowed
 */
exports.rateLimitAppKey = function(appName, key, cost, callback){
    async.waterfall([
        function(cb) { return redis.ensureScript(client, lua.perform_rate_limiting, cb); },
        function(cb) {
            d = new Date();
            currentEpoch = d.getTime();
            return client.eval(lua.perform_rate_limiting,
                                3,
                                rateLimitKey(appName, key),
                                tokensKey(appName, key),
                                epochMsKey(appName, key),
                                currentEpoch,
                                cost,
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
