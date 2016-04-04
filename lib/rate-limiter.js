async = require('async');

weekInSeconds = 60 * 60 * 24 * 7;

/**
 * ensureSet
 * Check to make sure a set exists at the specified key
 * @param {string} key Key under which the set should live
 * @param {string} def Value to store in the set if it is not initialized
 * @param {redis-client} client Redis client from the redis-client.js file
 * @param {function} callback signature (err)
 */
ensureSet = function(key, def, client, callback) {
    client.exists(key, function(err, res){
        if (err) {return callback(err);}
        if (res == 0) {
            client.sadd(key, def, function(err, res) {
                if (err) {return callback(err);}
                client.expire(key, weekInSeconds, function(err, res) {
                    if (err) {return callback(err);}
                    return callback();
                });
            })
        }
        return callback();
    })
};

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
            })
        }
        return callback();
    })
};

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
    rlBaseName = appName + ":" + key;
    async.series([
        function(cb){
            ensureSet(appName, appName, client, cb);
        },
        function(cb){
            client.sadd(appName, key, function(err, res){
                if (err){return cb(err);}
                return cb();
            })
        },
        function(cb){
            ensureString(rlBaseName+"_rl", rateLimit.toString(), client, cb);
        },
        function(cb){
            d = new Date();
            currentEpoch = d.getTime();
            ensureString(rlBaseName+"_epoch_ms", currentEpoch.toString(), client, cb);
        },
        function(cb){
            ensureString(rlBaseName+"_tkns", rateLimit.toString(), client, cb);
        }
        ],
        callback);
};
