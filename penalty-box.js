var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var async = require('async');
var winston = require('winston');
var expressWinston = require('express-winston');
var config = require('./lib/config');
var rateLimiter = require('./lib/rate-limiter');
var metrics_middleware = require('./middleware/metrics');
var redis = require('./lib/redis-client');
var client = redis.client;

var app = express();
// Middleware to run before processing requests
app.use(metrics_middleware.handle);
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
 * limit: number of requests allowed per minute
 * remaining: number of requests remaining
 * is_rate_limited: will return boolean based off of if the request should be rate limited
 * reset: time your rate limit will be reset, in epoch_ms
 * @param {string} appName the name of the app trying to use the rate limiter
 * @param {string} key the key the app is attempting to rate limit on
 * @param {integer} cost how many tokens the requests take
 * @param {integer} rateLimit max number of requests per minute for this key
 */
app.post('/rate-limit', function(req, res) {
  appName = req.body.app_name;
  key = req.body.key;
  cost = req.body.cost;
  rateLimit = req.body.rate_limit;

  responseBody = {}

  client.keys('*', function(err, values){})

  if ([appName, key, cost, rateLimit].some(_.isUndefined)) {
    return res.sendStatus(400);
  }
  async.waterfall([
    function(cb){
      return rateLimiter.ensureAppAndKey(appName, key, rateLimit, client, cb);
    },
    function(cb){
      return rateLimiter.rateLimit(appName, key, client, function(err, response){
        if (err){return cb(err);}
        responseBody['limit'] =  response;
        return cb();
      })
    },
    function(cb){
      return rateLimiter.rateLimitAppKey(appName, key, cost, function(err, returnVals){
            if(err){return cb(err);}

        if (returnVals[0] < 0) {
          responseBody['is_rate_limited'] = false;
        } else {
          responseBody['is_rate_limited'] = true;
        }

        responseBody['remaining'] = returnVals[1];
        return cb();
      });
    },
    function(cb){
      return rateLimiter.epochMs(appName, key, client, function(err, response){
        if (err){return cb(err);}
        // Time returned is the last time epochMs was set. Need to add a minute to
        // get the time it resets
        responseBody['reset'] =  response + (1000 * 60);
        return cb();
      })
    }
  ], function(err){
      if (err){
        res.status(500);
      }
      res.json(responseBody);
      return;
    });
});


app.listen(config.port, function() {
  logger.info('penalty-box server listening on port ' + config.port);
});


module.exports = app;
