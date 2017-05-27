const DcsBiosExportParser = require('./lib/dcs-bios-export-parser');
const logger = require('./lib/logger');

var parser = new DcsBiosExportParser({ logLevel: 'warn' });
parser.startListening();

parser.on('MetadataStart/_ACFT_NAME', (value) => {
  logger.info(`aircraft name: '${value}'`);
});
