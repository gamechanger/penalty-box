var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var async = require('async');
var winston = require('winston');
var expressWinston = require('express-winston');
var config = require('./lib/config');
var rateLimiter = require('./lib/rate-limiter');
var redis = require('./lib/redis-client');
var client = redis.client;

var app = express();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

var logger = new (winston.Logger)();
logger.add(winston.transports.Console, {timestamp: true});

if (config.log_requests.toLowerCase() === 'true') {
  app.use(expressWinston.logger({
    transports: [
      new winston.transports.Console({
        json: true,
        colorize: true,
        timestamp: true
      })
    ],
    meta: config.debug.toLowerCase() === 'true' ? true : false,
    msg: "{{res.statusCode}} HTTP {{req.method}} {{req.url}}"
  }));
}

app.get('/health', function(req, res) {
  return res.sendStatus(200);
});

/**
 * POST /rate-limit
 * This will check the application's key to make sure a request is allowed
 * 404 Response will be returned if limit has been reached
 * 200 Response will be returned request is allowed
 * X-Rate-Limit-Limit will be returned in a header with the number of requests allowed per hour
 * X-Rate-Limit-Remaining will be returned in a header with the number of requests remaining
 * @param {string} appName the name of the app trying to use the rate limiter
 * @param {string} key the key the app is attempting to rate limit on
 * @param {integer} cost how many tokens the requests take
 * @param {integer} rateLimit max number of requests per hour for this key
 */
app.post('/rate-limit', function(req, res) {
  appName = req.body.appName;
  key = req.body.key;
  cost = req.body.cost;
  rateLimit = req.body.rateLimit;
  console.log("IN RATE LIMIT");
  console.log(appName, key, cost, rateLimit);

  client.keys('*', function(err, values){
    console.log("keys we got back");
    console.log(values);
  })

  if ([appName, key, cost, rateLimit].some(_.isUndefined)) {
    return res.sendStatus(400);
  }
  async.waterfall([
    function(cb){
      console.log("pre ensureAppAndKey");
      return rateLimiter.ensureAppAndKey(appName, key, rateLimit, client, cb);
    },
    function(cb){
      console.log("pre rateLimit");
      return rateLimiter.rateLimit(appName, key, client, function(err, response){
        if (err){return cb(err);}
        setRateLimit = response;
        console.log("post limit");
        res.set('X-Rate-Limit-Limit', response);
        return cb();
      })
    },
    function(cb){
      console.log("pre rateLimit Apply")
      return rateLimiter.rateLimitAppKey(appName, key, cost, function(err, response){
        console.log("post rateLimit Apply")
        if(err){return cb(err);}

        if (response < 0) {
          res.status(404);
          response = 0;
        } else {
          res.status(200);
        }

        res.set('X-Rate-Limit-Remaining', response);
        return cb();
      });
    }
  ], function(err){
      console.log("in rate-limit call back");
      console.log(err);
      if (err){
        res.status(500);
      }
      res.send("");
      return;
    });
});


app.listen(config.port, function() {
  logger.info('penalty-box server listening on port ' + config.port);
});


module.exports = app;
