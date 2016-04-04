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
    describe('Test ensureAppAndKey', function () {
        it('Test basic setup', function(done){
            rateLimiter.ensureAppAndKey("testApp", "key", 60, testClient, function(){
                testClient.get('testApp:key_rl', function(err, res){
                    assert.equal('60', res);
                });
                testClient.get('testApp:key_tkns', function(err, res){
                    assert.equal('60', res);
                });
                testClient.get('testApp:key_epoch_ms', function(err, res){
                    assert.equal(false, null == res);
                    done();
                });
            });
        });
        it('Test more complicated setup', function(done){
            rateLimiter.ensureAppAndKey("testApp", "key1", 60, testClient, function(){
                rateLimiter.ensureAppAndKey("testApp", "key2", 55, testClient, function(){
                    rateLimiter.ensureAppAndKey("testApp", "key3", 50, testClient, function(){
                        rateLimiter.ensureAppAndKey("testApp", "key1", 45, testClient, function(){
                            async.waterfall([
                                function(cb){
                                    testClient.keys('*', function(err, res){
                                        assert.equal(9, res.length);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key1_rl', function(err, res){
                                        assert.equal('60', res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key1_tkns', function(err, res){
                                        assert.equal('60', res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key1_epoch_ms', function(err, res){
                                        assert.equal(false, null == res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key2_rl', function(err, res){
                                        assert.equal('55', res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key2_tkns', function(err, res){
                                        assert.equal('55', res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key2_epoch_ms', function(err, res){
                                        assert.equal(false, null == res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key3_rl', function(err, res){
                                        assert.equal('50', res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key3_tkns', function(err, res){
                                        assert.equal('50', res);
                                        cb();
                                    });
                                },
                                function(cb){
                                    testClient.get('testApp:key3_epoch_ms', function(err, res){
                                        assert.equal(false, null == res);
                                        cb();
                                    });
                                },
                            ],
                            function(err){done();});

                        });
                    });
                });
            });
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
