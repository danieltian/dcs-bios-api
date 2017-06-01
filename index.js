const DcsBiosExportParser = require('./lib/dcs-bios-export-parser');
const log = require('./lib/logger');

var parser = new DcsBiosExportParser({ logLevel: 'INFO' });
parser.startListening();

parser.on('_ACFT_NAME', (value) => {
  log.info('aircraft name:', value);
});
