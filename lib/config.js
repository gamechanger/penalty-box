var argv = require('optimist')
    .default('debug', process.env.DEBUG || 'false')
    .default('log_requests', process.env.LOG_REQUESTS || 'true')
    .default('port', process.env.PENALTY_BOX_PORT || 80)
    .default('redis_host', process.env.REDIS_HOST || 'localhost')
    .default('redis_port', process.env.REDIS_PORT || 6379)
    .default('datadog_host', process.env.DATADOG_HOST || 'localhost')
    .default('datadog_port', process.env.DATADOG_PORT || 8135)
    .default('log_file', process.env.LOG_FILE || '/var/log/penalty-box.log')
    .argv;

module.exports = argv;
