const Logger = require('logplease');
const logger = Logger.create('dcs-bjson');

logger.setLogLevel = (logLevel) => {
  Logger.setLogLevel(logLevel);
};

module.exports = logger;
