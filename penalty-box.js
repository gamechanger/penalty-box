var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var async = require('async');
var winston = require('winston');
var expressWinston = require('express-winston');
var rateLimiter = require('./lib/rate-limiter');
var redis = require('./redis-client');
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
  return res.send(200);
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

  if ([appName, key, cost, rateLimit].some(_.isUndefined)) {
    return res.sendStatus(400);
  }
  async.series([
    function(cb){
      return rateLimiter.ensureAppAndKey(appName, key, rateLimit, client, cb);
    },
    function(cb){
      return rateLimiter.rateLimit(appName, key, client, function(err, response){
        if (err){return cb(err);}
        res.set('X-Rate-Limit-Limit', response);
      })
      return cb();
    },
    function(cb){
      return rateLimiter.rateLimitAppKey(appName, key, cost, function(err, response){
        if(err){return cb(err);}

        if (response < 0) {
          res.status(404);
          response = 0;
        } else {
          res.status(200);
        }

        res.set('X-Rate-Limit-Remaining', response);
        res.send("");
        return cb();
      });
    }
  ]);
});


module.exports = app;
