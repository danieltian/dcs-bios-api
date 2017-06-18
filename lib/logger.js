const Logger = require('logplease');
const logger = Logger.create('dcs-bios-api');

// Monkey patch in the ability to set the log level from within the logger instance.
logger.setLogLevel = (logLevel) => {
  Logger.setLogLevel(logLevel);
};

module.exports = logger;
