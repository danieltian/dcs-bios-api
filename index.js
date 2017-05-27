const config = require('config');
const EventEmitter = require('events');
const BufferReader = require('./lib/buffer-reader');
const jsonParser = require('./lib/dcs-bios-json-parser');
const UdpClient = require('./lib/udp-multicast-client');
const logger = require('eazy-logger').Logger(config.get('indexLogger'));
const glob = require('glob');
const path = require('path');

class DcsBiosParser extends EventEmitter {
  constructor() {
    super();
    this.client = new UdpClient(config.get('udpClient'));
    this.client.start();

    var files = glob.sync(path.resolve('./json/*.json'));
    this.aircraftJson = {};
    this.addressLookup = {};
    jsonParser.parseFiles(files, this.aircraftJson, this.addressLookup);

    this.data = Buffer.alloc(65536);
    this.emitQueue = [];

    this.client.on('message', (message) => {
      this.parseMessage(message);
    });

    this.on('_ACFT_NAME', (value) => {
      this.currentAircraft = value.trim().replace('\0', '');
    });
  }

  parseMessage(message) {
    var reader = new BufferReader(message);

    if (reader.length < 4) {
      logger.warn('incomplete message received: length is < 4');
      return;
    }

    // Go through each update in the message.
    while (reader.position < message.length) {
      var address = reader.readUInt16LE();
      var count = reader.readUInt16LE();
      var controlAddress = address;

      // EARLY OUT: If this is a sync, we're safe to tell the subscribers about the updates. Process all the emites in
      // the queue.
      if (address == 0x5555 && count == 0x5555) {
        this.processEmitQueue();
        continue;
      }
      else {
        while (count) {
          count = count - 2;
          this.data.writeUInt16LE(reader.readUInt16LE(), controlAddress);

          // Find the closest address that has a control. Need to do this because string updates can be partial updates
          // and the address will not have any controls.
          while (!this.addressLookup[controlAddress]) {

            controlAddress = controlAddress - 2;
          }

          this.addressLookup[controlAddress].forEach((control) => {
            control.outputs.forEach((output) => {
              var value;

              if (output.type == 'string') {
                value = this.data.toString('utf8', controlAddress, controlAddress + output.max_length);
              }
              else {
                value = (this.data.readUInt16LE(controlAddress) & output.mask) >> output.shift_by;
              }

              if (output.value != value && !this.emitQueue.includes(control)) {
                this.emitQueue.push({ output, control });
                output.value = value;
              }
            });
          });
        }
      }

      address = address + 2;
    }
  }

  processEmitQueue() {
    this.emitQueue.forEach((entry) => {
      var isMetadata = (entry.control.category == 'Metadata' || entry.control.type == 'metadata');
      var identifier = entry.control.identifier + entry.output.suffix;

      if (!isMetadata) {
        identifier = this.currentAircraft + '/' + identifier;
      }

      this.emit(identifier, entry.output.value, entry.control);
    });

    this.emitQueue = [];
  }
}

module.exports = new DcsBiosParser();
