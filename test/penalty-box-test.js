var request = require('supertest');
var app = require('../penalty-box');
var assert = require('assert');

describe("HTTP Endpoint Tests", function(){
    d = new Date();
    describe("Get Tests", function(){
        describe("/rate-limit tests", function(){
            it("simple rate limit when key not set up yet", function() {
                request(app)
                .get('/rate-limit')
                .query({app_name: "test"})
                .query({key: "key3"})
                .end(function(err, res){
                    assert.equal(res.body['is_rate_limited'], false);
                    done();
                });
            });
            it("simple rate limit when key is set up", function() {
                form = {"app_name": "test", "key": "key4", "cost": 1, "rate_limit": 10};
                request(app)
                .post('/rate-limit')
                .set('Content-Type', 'application/json')
                .send(form)
                .end(function(err, res){
                    request(app)
                    .get('/rate-limit')
                    .query({app_name: "test"})
                    .query({key: "key4"})
                    .end(function(err, res){
                        assert.equal(res.body['is_rate_limited'], false);
                        done();
                    });
                });
            });
            it("simple rate limit when key is set up and are rate limited", function() {
                form = {"app_name": "test", "key": "key5", "cost": 1, "rate_limit": 1};
                request(app)
                .post('/rate-limit')
                .set('Content-Type', 'application/json')
                .send(form)
                .end(function(err, res){
                    request(app)
                    .get('/rate-limit')
                    .query({app_name: "test"})
                    .query({key: "key5"})
                    .end(function(err, res){
                        assert.equal(res.body['is_rate_limited'], true);
                        done();
                    });
                });
            });
        });
    });
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
                    assert.equal(res.body['limit'], 10);
                    assert.equal(res.body['is_rate_limited'], false);
                    assert.equal(res.body['remaining'], 9);
                    assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)
                    done();
                });
            });
            it("post method with period", function(done){
                period = 1000;
                epoch1 = d.getTime() + period * 1000;
                form = {"app_name": "test2", "key": "key2", "cost": 1, "rate_limit": 10, "period": period};
                request(app)
                .post('/rate-limit')
                .set('Content-Type', 'application/json')
                .send(form)
                .end(function(err, res){
                    epoch2 = d.getTime() + period * 1000;
                    assert.equal(200, res.status);
                    assert.equal(res.body['limit'], 10);
                    assert.equal(res.body['is_rate_limited'], false);
                    assert.equal(res.body['remaining'], 9);
                    assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)
                    done();
                });
            });
            it("cannot change rate limit", function(done){
                epoch1 = d.getTime() + 60 * 1000;
                form = {"app_name": "test1", "key": "keyX", "cost": 1, "rate_limit": 10};
                request(app)
                .post('/rate-limit')
                .set('Content-Type', 'application/json')
                .send(form)
                .end(function(err, res){
                    epoch2 = d.getTime() + 60 * 1000;
                    assert.equal(200, res.status);
                    assert.equal(res.body['limit'], 10);
                    assert.equal(res.body['is_rate_limited'], false);
                    assert.equal(res.body['remaining'], 9);
                    assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)

                    form["rate_limit"] = 100;
                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        epoch2 = d.getTime() + 60 * 1000;
                        assert.equal(200, res.status);
                        assert.equal(res.body['limit'], 10);
                        assert.equal(res.body['is_rate_limited'], false);
                        assert.equal(res.body['remaining'], 8);
                        assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)

                        form["rate_limit"] = 1000;
                        request(app)
                        .post('/rate-limit')
                        .set('Content-Type', 'application/json')
                        .send(form)
                        .end(function(err, res){
                            epoch2 = d.getTime() + 60 * 1000;
                            assert.equal(200, res.status);
                            assert.equal(res.body['limit'], 10);
                            assert.equal(res.body['is_rate_limited'], false);
                            assert.equal(res.body['remaining'], 7);
                            assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)
                            done();
                        });
                    });
                });
            });

            it("multiple calls leading to 404. Check reset properly", function(done){
                epoch1 = d.getTime() + 60 * 1000;
                form = {"app_name": "test1", "key": "keyY", "cost": 1, "rate_limit": 2};
                request(app)
                .post('/rate-limit')
                .set('Content-Type', 'application/json')
                .send(form)
                .end(function(err, res){
                    epoch2 = d.getTime() + 60 * 1000;
                    assert.equal(200, res.status);
                    assert.equal(res.body['limit'], 2);
                    assert.equal(res.body['is_rate_limited'], false);
                    assert.equal(res.body['remaining'], 1);
                    assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)

                    request(app)
                    .post('/rate-limit')
                    .set('Content-Type', 'application/json')
                    .send(form)
                    .end(function(err, res){
                        epoch2 = d.getTime() + 60 * 1000;
                        assert.equal(200, res.status);
                        assert.equal(res.body['limit'], 2);
                        assert.equal(res.body['is_rate_limited'], false);
                        assert.equal(res.body['remaining'], 0);
                        assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)

                        request(app)
                        .post('/rate-limit')
                        .set('Content-Type', 'application/json')
                        .send(form)
                        .end(function(err, res){
                            epoch2 = d.getTime() + 60 * 1000;
                            assert.equal(200, res.status);
                            assert.equal(res.body['limit'], 2);
                            assert.equal(res.body['is_rate_limited'], true);
                            assert.equal(res.body['remaining'], 0);
                            assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)
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
                        assert.equal(200, res.status);
                        assert.equal(res.body['limit'], 0);
                        assert.equal(res.body['is_rate_limited'], true);
                        assert.equal(res.body['remaining'], 0);
                        assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)
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
                        assert.equal(200, res.status);
                        assert.equal(res.body['limit'], 10);
                        assert.equal(res.body['is_rate_limited'], true);
                        assert.equal(res.body['remaining'], 10);
                        assert(res.body['reset'] >= epoch1 && res.body['reset'] <= epoch2)
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
