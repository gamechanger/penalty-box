var assert = require('assert');
var _ = require('underscore');
var testClient = require('../../lib/test-redis-client').client;
var rateLimiter = require('../../lib/rate-limiter');

describe('Test the functions that are adding values to redis', function() {
    describe('Test ensureAppAndKey', function () {
        it('Test basic setup', function(){
            testClient.innerDict = {};
            rateLimiter.ensureAppAndKey("testApp", "key1", 60, testClient, function(){})
            assert.equal('60', testClient.innerDict['testApp:key1_rl']);
            assert.equal('60', testClient.innerDict['testApp:key1_tkns']);
            assert.equal('testApp:key1_epoch_ms' in testClient.innerDict, true);
        });
        it('Test more complicated setup', function(){
            testClient.innerDict = {};
            rateLimiter.ensureAppAndKey("testApp", "key1", 60, testClient, function(){})
            rateLimiter.ensureAppAndKey("testApp", "key2", 55, testClient, function(){})
            rateLimiter.ensureAppAndKey("testApp", "key3", 50, testClient, function(){})
            rateLimiter.ensureAppAndKey("testApp", "key1", 45, testClient, function(){})
            assert.equal(9, _.keys(testClient.innerDict).length)
            assert.equal('60', testClient.innerDict['testApp:key1_rl']);
            assert.equal('60', testClient.innerDict['testApp:key1_tkns']);
            assert.equal('testApp:key1_epoch_ms' in testClient.innerDict, true);
            assert.equal('55', testClient.innerDict['testApp:key2_rl']);
            assert.equal('55', testClient.innerDict['testApp:key2_tkns']);
            assert.equal('testApp:key2_epoch_ms' in testClient.innerDict, true);
            assert.equal('50', testClient.innerDict['testApp:key3_rl']);
            assert.equal('50', testClient.innerDict['testApp:key3_tkns']);
            assert.equal('testApp:key3_epoch_ms' in testClient.innerDict, true);
        });
    });
    describe('Test keyToken', function(){
        it('Test Basic Setup', function(){
            testClient.innerDict = {};
            testClient.innerDict["testApp"] = ["key1", "key2", "key3"];
            testClient.innerDict["testApp:key1_tkns"] = "60";
            testClient.innerDict["testApp:key2_tkns"] = "55";
            testClient.innerDict["testApp:key3_tkns"] = "50";
            rateLimiter.keyToken("testApp", "key1", testClient, function(err, response){
                assert.equal(null, err);
                assert.equal(60, response);
            });
            rateLimiter.keyToken("testApp", "key2", testClient, function(err, response){
                assert.equal(null, err);
                assert.equal(55, response);
            });
            rateLimiter.keyToken("testApp", "key3", testClient, function(err, response){
                assert.equal(null, err);
                assert.equal(50, response);
            });
        });
        it('Empty dict', function(){
            testClient.innerDict = {};
            rateLimiter.keyToken("testApp", "key1", testClient, function(err, response){
                assert.equal(null, err);
                assert.equal(null, response);
            });
        });
    });
});
