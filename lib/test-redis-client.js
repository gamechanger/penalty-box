var testRedisClient = {
    innerDict: {},
    exists: function (key, cb){
        return cb(null, key in this.innerDict);
    },
    sadd: function(key, value, cb){
        if (key in this.innerDict){
            this.innerDict[key].push(value)
        } else {
           this.innerDict[key] = [value];
        }
        return cb();
    },
    expire: function(key, time, cb){
        return cb();
    },
    set: function(key, value, time, cb){
        this.innerDict[key] = value;
        return cb();
    },
    smembers: function(key, cb){
        return cb(null, this.innerDict[key]);
    },
    get: function(key, cb){
        return cb(null, this.innerDict[key]);
    }
};

exports.client = testRedisClient;
