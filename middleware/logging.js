var expressWinston = require("express-winston");
var logging = require("../lib/logging");
var config = require("../lib/config")

var winstonMiddleware = expressWinston.logger({
    "transports": [logging.consoleLogger, logging.fileLogger],
    "meta": config.debug.toLowerCase() === 'true' ? true : false,
    "msg": "{{res.statusCode}} HTTP {{req.method}} {{req.url}}"
});

exports.handle = winstonMiddleware;
