var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var testClient = require('../../lib/redis-client').client;
var rateLimiter = require('../../lib/rate-limiter');

describe('Test the functions that are adding values to redis', function() {
    beforeEach(function(done){
        testClient.keys('*', function(err, keys){
            array = [];
            for (i=0; i < keys.length; i++){
                var val = keys[i]
                addToArray = function(val){
                    array.push(function(cb){
                            testClient.del(val, function(err){
                                cb();
                            });
                    });
                }
                addToArray(val);
            }
            async.waterfall(array, function(err){done();})
        });
    });
    describe('Test keyToken', function(){
        it('Test Basic Setup', function(done){
            testClient.set("testApp:key1_tkns", "60", function(err){
                testClient.set("testApp:key2_tkns", "55", function(err){
                    testClient.set("testApp:key3_tkns", "50", function(err){
                        async.waterfall([
                            function(cb){
                                testClient.keys('*', function(err, keys){
                                    cb();
                                });
                            },
                            function(cb){
                                rateLimiter.keyToken("testApp", "key1", testClient, function(err, response){
                                    assert.equal(null, err);
                                    assert.equal(60, response);
                                    cb();
                                });
                            },
                            function(cb){
                                rateLimiter.keyToken("testApp", "key2", testClient, function(err, response){
                                    assert.equal(null, err);
                                    assert.equal(55, response);
                                    cb();
                                });
                            },
                            function(cb){
                                rateLimiter.keyToken("testApp", "key3", testClient, function(err, response){
                                    assert.equal(null, err);
                                    assert.equal(50, response);
                                    cb();
                                });
                            },
                            ],
                            function(err){console.log("DONE");done();});
                    });
                });
            });
        });
        it('Empty dict', function(done){
            testClient.innerDict = {};
            rateLimiter.keyToken("testApp", "key1", testClient, function(err, response){
                assert.equal(null, err);
                assert.equal(null, response);
                done();
            });
        });
    });
});
