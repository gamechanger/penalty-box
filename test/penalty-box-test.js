var request = require('supertest');
var app = require('../penalty-box');
var assert = require('assert');

describe("HTTP Endpoint Tests", function(){
    d = new Date();
    describe("POST Tests", function(){
        describe("/rate-limit tests", function(){
            it("simple post method", function(done){
                epoch1 = d.getTime() + 60 * 1000;
                form = {"app_name": "test1", "key": "key1", "cost": 1, "rate_limit": 10};
                request(app)
                .post('/rate-limit')
                .set('Content-Type', 'application/json')
                .send(form)
                .end(function(err, res){
                    epoch2 = d.getTime() + 60 * 1000;
                    assert.equal(200, res.status);
                    assert.equal(res.body['X-Rate-Limit-Limit'], 10);
                    assert.equal(res.body['X-Rate-Limit-Remaining'], 9);
                    assert(res.body['X-Rate-Limit-Reset'] >= epoch1 && res.body['X-Rate-Limit-Reset'] <= epoch2)
                    done();
                });
            });

            it("multiple calls leading to 404. Check reset properly", function(done){
                epoch1 = d.getTime() + 60 * 1000;
                form = {"app_name": "test1", "key": "keyX", "cost": 1, "rate_limit": 2};
                request(app)
                .post('/rate-limit')
                .set('Content-Type', 'application/json')
                .send(form)
                .end(function(err, res){
                    epoch2 = d.getTime() + 60 * 1000;
                    assert.equal(200, res.status);
                    assert.equal(res.body['X-Rate-Limit-Limit'], 2);
                    assert.equal(res.body['X-Rate-Limit-Remaining'], 1);
                    assert(res.body['X-Rate-Limit-Reset'] >= epoch1 && res.body['X-Rate-Limit-Reset'] <= epoch2)

                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        epoch2 = d.getTime() + 60 * 1000;
                        assert.equal(200, res.status);
                        assert.equal(res.body['X-Rate-Limit-Limit'], 2);
                        assert.equal(res.body['X-Rate-Limit-Remaining'], 0);
                        assert(res.body['X-Rate-Limit-Reset'] >= epoch1 && res.body['X-Rate-Limit-Reset'] <= epoch2)

                        request(app)
                        .post('/rate-limit')
                        .set('Content-Type', 'application/json')
                        .send(form)
                        .end(function(err, res){
                            epoch2 = d.getTime() + 60 * 1000;
                            assert.equal(429, res.status);
                            assert.equal(res.body['X-Rate-Limit-Limit'], 2);
                            assert.equal(res.body['X-Rate-Limit-Remaining'], 0);
                            assert(res.body['X-Rate-Limit-Reset'] >= epoch1 && res.body['X-Rate-Limit-Reset'] <= epoch2)
                            done();
                        });
                    });
                });
            });

            describe("404 because cost is to high", function(){
                it("cost 1, initial rate limit 0", function(done){
                    epoch1 = d.getTime() + 60 * 1000;
                    form = {"app_name": "test1", "key": "key2", "cost": 1, "rate_limit": 0};
                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        epoch2 = d.getTime() + 60 * 1000;
                        assert.equal(429, res.status);
                        assert.equal(res.body['X-Rate-Limit-Limit'], 0);
                        assert.equal(res.body['X-Rate-Limit-Remaining'], 0);
                        assert(res.body['X-Rate-Limit-Reset'] >= epoch1 && res.body['X-Rate-Limit-Reset'] <= epoch2)
                        done();
                    });
                })
                it("cost 11, initial rate limit 10", function(done){
                    epoch1 = d.getTime() + 60 * 1000;
                    form = {"app_name": "test1", "key": "key3", "cost": 11, "rate_limit": 10};
                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        epoch2 = d.getTime() + 60 * 1000;
                        assert.equal(429, res.status);
                        assert.equal(res.body['X-Rate-Limit-Limit'], 10);
                        assert.equal(res.body['X-Rate-Limit-Remaining'], 10);
                        assert(res.body['X-Rate-Limit-Reset'] >= epoch1 && res.body['X-Rate-Limit-Reset'] <= epoch2)
                        done();
                    });
                })
            });

            describe("errors due to not passing the write arguments", function(){
                it("did not pass app_name", function(done){
                    form = {"key": "key1", "cost": 1, "rate_limit": 10};
                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        assert.equal(400, res.status);
                        done();
                    });
                });
                it("did not pass key", function(done){
                    form = {"app_name": "test1", "cost": 1, "rate_limit": 10};
                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        assert.equal(400, res.status);
                        done();
                    });
                });
                it("did not pass cost", function(done){
                    form = {"app_name": "test1", "key": "key1", "rate_limit": 10};
                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        assert.equal(400, res.status);
                        done();
                    });
                });
                it("did not pass rate_limit", function(done){
                    form = {"app_name": "test1", "key": "key1", "cost": 1};
                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        assert.equal(400, res.status);
                        done();
                    });
                });
            });
        });
    });
});
