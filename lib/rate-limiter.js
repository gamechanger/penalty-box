async = require('async');

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
            client.set(key, def, weekInSeconds, function(err, res) {
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
 * rateLimiterKey
 * This takes an app name and a key and returns the redis key to store the max rate limit under
 * @param {string} appName
 * @param {string} key
 */
 rateLimiterKey = function(appName, key){
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
    async.series([
        function(cb){
            ensureString(rateLimiterKey(appName, key), rateLimit.toString(), client, cb);
        },
        function(cb){
            d = new Date();
            currentEpoch = d.getTime();
            ensureString(epochMsKey(appName, key), currentEpoch.toString(), client, cb);
        },
        function(cb){
            ensureString(tokensKey(appName, key), rateLimit.toString(), client, cb);
        }
        ],
        callback);
};

/**
 * appKeysTokens
 * Given an app, this function will return all keys and the tokens they have left (same as requests they have left)
 * @param {string} appName The name of the app you want to retrieve the apps from
 * @param {string} key The key the app is looking to rate limit on
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err, response)
 */
exports.keyToken = function(appName, key, client, callback){
    client.get(tokensKey(appName, key), function(err, res){
        if (err){return callback(err);}
        if (res != null){
            res = parseInt(res);
        }
        return callback(null, res);
    });
}
