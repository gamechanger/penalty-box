var http = require('http');
var _ = require('underscore');
var StatsD = require('node-dogstatsd').StatsD;
var config = require('../lib/config');

statsd = new StatsD(config.datadog_host, config.datadog_port);

exports.handle = function(req, res, next){
    tags = {'request_path': req.path};
    statsd.increment('requests', 1, tags);
    statsd.gauge('open_sockets', _(http.globalAgent.sockets).reduce(function(m, arr) {return m + arr.length;}, 0));

    var start = Date.now();
    res.on('finish', function() {
        var tags = {
            http_code:  res.statusCode,
            request_path: req.path
        };
        statsd.increment('responses', 1, tags);
        statsd.timing('response_time', Date.now()-start, tags)
    });

    next();
}
