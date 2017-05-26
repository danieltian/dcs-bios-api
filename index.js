const dgram = require('dgram');
const fs = require('fs');
const config = require('config');
const EventEmitter = require('events');
const UdpClient = require('./udp-multicast-client');
const BufferReader = require('./buffer-reader');
const logger = require('eazy-logger').Logger(config.get('indexLogger'));
const glob = require('glob');

class DcsBiosParser extends EventEmitter {
  constructor() {
    super();
    this.client = new UdpClient(config.get('udpClient'));
    this.client.start();

    this.data = Buffer.alloc(65536);

    this.client.on('message', (message) => {
      parseMessage(message);
    });
  }

  parseMessage(message) {
    var reader = new BufferReader(message);

    if (reader.length < 4) {
      logger.warn('incomplete message received: length is < 4');
      return;
    }
    // TODO: fix this, this is supposed to be the sync string, not a start marker
    else if (reader.readUInt32LE() !== 0x55555555) {
      logger.warn('incomplete message received: missing start marker');
      return;
    }
    else {
      // Go through each update in the message.
      while (reader.position < message.length) {
        var address = reader.readUInt16LE();
        var count = reader.readUInt16LE();

        while (count) {
          count = count - 2;
          this.data.writeUInt16LE(reader.readUInt16LE(), address);

          var searchAddress = address;
          while (!idLookup[searchAddress]) {
            searchAddress -= 2;
          }

          idLookup[searchAddress].forEach((control) => {
            control.outputs.forEach((output) => {
              var value;

              if (output.type == 'string') {
                value = this.data.toString('utf8', searchAddress, searchAddress + output.max_length);
              }
              else {
                value = (this.data.readUInt16LE(searchAddress) & output.mask) >> output.shift_by;
              }

              if (output.value != value) {
                this.emit(control.identifier, value);
                output.value = value;
              }
            });
          });

          address += 2;
        }
      }
    }
  }
}

module.exports = DcsBiosParser;
