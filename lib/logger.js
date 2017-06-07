const Logger = require('logplease');
const logger = Logger.create('dcs-bios-api');

logger.setLogLevel = (logLevel) => {
  Logger.setLogLevel(logLevel);
};

module.exports = logger;
