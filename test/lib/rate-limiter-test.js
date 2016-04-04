var assert = require('assert');
var testClient = require('../../lib/test-redis-client').client;
var rateLimiter = require('../../lib/rate-limiter');

describe('Test the functions that are adding values to redis', function() {
    describe('Test ensureAppAndKey', function () {
        it('Test basic setup', function(){
            rateLimiter.ensureAppAndKey("testApp", "key1", 60, testClient, function(){})
            assert.equal('60', testClient.innerDict['testApp:key1_rl']);
            assert.equal('60', testClient.innerDict['testApp:key1_tkns']);
            assert.equal('testApp:key1_epoch_ms' in testClient.innerDict, true);
            expectedList = ["testApp", "key1"]
            assert.equal(expectedList.length, testClient.innerDict['testApp'].length);
            for (i=0; i < expectedList.length; i ++){
                assert.equal(expectedList[i], testClient.innerDict['testApp'][i])
            }
        })
    })
})
