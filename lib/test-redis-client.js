var testRedisClient = {
    innerDict: {},
    exists: function (key, cb){
        return cb(null, key in this.innerDict);
    },
    expire: function(key, time, cb){
        return cb();
    },
    set: function(key, value, time, cb){
        this.innerDict[key] = value;
        return cb();
    },
    get: function(key, cb){
        if (!(key in this.innerDict)){
            return cb(null, null);
        }
        return cb(null, this.innerDict[key]);
    }
};

exports.client = testRedisClient;
