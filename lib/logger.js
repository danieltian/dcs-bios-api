const config = require('config');
const logger = require('eazy-logger').Logger(config.get('logger'));

module.exports = logger;
