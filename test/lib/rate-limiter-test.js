var assert = require('assert');
var _ = require('underscore');
var testClient = require('../../lib/test-redis-client').client;
var rateLimiter = require('../../lib/rate-limiter');

describe('Test the functions that are adding values to redis', function() {
    describe('Test ensureAppAndKey', function () {
        it('Test basic setup', function(){
            testClient.innerDict = {}
            rateLimiter.ensureAppAndKey("testApp", "key1", 60, testClient, function(){})
            assert.equal('60', testClient.innerDict['testApp:key1_rl']);
            assert.equal('60', testClient.innerDict['testApp:key1_tkns']);
            assert.equal('testApp:key1_epoch_ms' in testClient.innerDict, true);
            expectedList = ["testApp", "key1"]
            assert.equal(expectedList.length, testClient.innerDict['testApp'].length);
            for (i=0; i < expectedList.length; i ++){
                assert.equal(expectedList[i], testClient.innerDict['testApp'][i])
            }
        });
    });
    describe('Test appKeysTokens', function(){
        it('Test Basic Setup', function(){
            testClient.innerDict = {}
            testClient.innerDict["testApp"] = ["key1", "key2", "key3"];
            testClient.innerDict["testApp:key1_tkns"] = "60"
            testClient.innerDict["testApp:key2_tkns"] = "55"
            testClient.innerDict["testApp:key3_tkns"] = "50"
            rateLimiter.appKeysTokens("testApp", testClient, function(err, response){
                assert.equal(null, err);
                assert.equal(true, _.isEqual({"key1": "60", "key2": "55", "key3": "50"}, response));
            });
        });
        it('Empty dict', function(){
            testClient.innerDict = {"testApp": []}
            rateLimiter.appKeysTokens("testApp", testClient, function(err, response){
                assert.equal(null, err);
                console.log(response)
                assert.equal(true, _.isEqual({}, response));
            });
        });
    });
});
