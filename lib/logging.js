var winston = require("winston");
var config = require("./config")

var consoleLogger = new winston.transports.Console({"timestamp": true});
var fileLogger = new winston.transports.File({"filename": config.log_file,
    "timestamp": true
});

var logger = new winston.Logger({
    "emitErrs": false,
    "transports": [consoleLogger, fileLogger]
});

var loggerMiddleware

exports.logger = logger
exports.consoleLogger = consoleLogger
exports.fileLogger = fileLogger
