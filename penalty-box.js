var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var async = require('async');
var logging = require('./lib/logging');
var loggingMiddleware = require('./middleware/logging');
var cluster = require('cluster');
var os = require('os');
var config = require('./lib/config');
var rateLimiter = require('./lib/rate-limiter');
var metrics_middleware = require('./middleware/metrics');
var redis = require('./lib/redis-client');
var client = redis.client;

var app = express();
// Middleware to run before processing requests
if (config.log_requests.toLowerCase() === 'true') {
  app.use(loggingMiddleware.handle);
}
app.use(metrics_middleware.handle);
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

var logger = logging.logger;

app.get('/health', function(req, res) {
  return res.sendStatus(200);
});

var DEFAULT_RATE_LIMIT_PERIOD_SECONDS = 60

/**
 * POST /rate-limit
 * This will check the application's key to make sure a request is allowed
 *
 * Return Values:
 * limit: number of requests allowed per minute
 * remaining: number of requests remaining
 * is_rate_limited: will return boolean based off of if the request should be rate limited
 * reset: time your rate limit will be reset, in epoch_ms
 *
 * @param {string} app_name the name of the app trying to use the rate limiter
 * @param {string} key the key the app is attempting to rate limit on
 * @param {integer} cost how many tokens the requests take
 * @param {integer} rate_limit max number of requests per minute for this key
 * @param {integer} period_seconds amount of time in seconds until the rate limit resets and the clients
 * are given rate_limit more requets. This param is optional
 */
app.post('/rate-limit', function(req, res) {
  appName = req.body.app_name;
  key = req.body.key;
  cost = req.body.cost;
  rateLimit = req.body.rate_limit;

  // Period is an optional argument. It allows you to specify how long till your rate limit
  // resets. If you do not specify your rate limit period we use the default
  if (req.body.period_seconds !== undefined) {
    rateLimitPeriodMs = req.body.period_seconds * 1000
  } else {
    rateLimitPeriodMs = DEFAULT_RATE_LIMIT_PERIOD_SECONDS * 1000
  }

  responseBody = {};

  if ([appName, key, cost, rateLimit].some(_.isUndefined)) {
    return res.sendStatus(400);
  }
  rateLimiter.rateLimitAppKey(appName, key, cost, rateLimit, rateLimitPeriodMs, client, function(err, returnVals){
        if(err){res.status(500);}

        if (returnVals[0] < 0) {
          responseBody.is_rate_limited = true;
        } else {
          responseBody.is_rate_limited = false;
        }

        responseBody.remaining = returnVals[1];
        responseBody.reset = returnVals[2];
        responseBody.limit = returnVals[3];
        res.json(responseBody);
        return;
  });
});

/**
 * GET /rate-limit
 * This will check the application's key to see if the key is currently rate limited
 *
 * Return Values:
 * is_rate_limited: will return boolean based off of if the key is currently rate limited
 *
 * @param {string} app_name the name of the app trying to use the rate limiter
 * @param {string} key the key the app is attempting to rate limit on
 */
app.get('/rate-limit', function(req, res) {
  appName = req.query.app_name;
  key = req.query.key;
 
  responseBody = {};

  if ([appName, key].some(_.isUndefined)) {
    return res.sendStatus(400);
  }

  rateLimiter.isRateLimited(appName, key, client, function(err, rateLimited) {
          if(err){res.status(500);}

          responseBody.is_rate_limited = rateLimited;        
          res.json(responseBody);
          return;
  });
});

if (cluster.isMaster) {
  var numCPUs = os.cpus().length;
  logger.info('Starting ' + numCPUs + ' penalty box processes');
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    logger.error('Worker process ' + worker.process.pid + ' died. Restarting...');
    cluster.fork();
  });
} else {
  app.listen(config.port, function() {
    logger.info('penalty-box server listening on port ' + config.port);
  });
}


module.exports = app;
