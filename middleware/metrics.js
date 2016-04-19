var http = require('http');
var _ = require('underscore');
var StatsD = require('node-dogstatsd').StatsD;
var config = require('../lib/config');

statsd = new StatsD(config.datadog_host, config.datadog_port);
prefix = "penalty-box."

exports.handle = function(req, res, next){
    tags = ['request_path:'+ req.path];
    statsd.increment(prefix + 'requests', 1, tags);
    statsd.gauge(prefix + 'open_sockets', _(http.globalAgent.sockets).reduce(function(m, arr) {return m + arr.length;}, 0));

    var start = Date.now();
    res.on('finish', function() {
        var tags = [
            'http_code:'+res.statusCode,
            'request_path:'+req.path
        ];
        statsd.increment(prefix + 'responses', 1, tags);
        statsd.timing(prefix + 'response_time', Date.now()-start, tags)
    });

    next();
}
