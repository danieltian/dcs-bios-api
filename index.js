// This file is for testing this library only, and also serves as a coding example for how to this library.
const DcsBiosExportParser = require('./lib/dcs-bios-export-parser');
const log = require('./lib/logger');

var parser = new DcsBiosExportParser({ logLevel: 'INFO' });
parser.startListening();

parser.on('_ACFT_NAME', (value) => {
  log.info('aircraft name:', value);
});
