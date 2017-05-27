const EventEmitter = require('events');
const config = require('config');
const path = require('path');
const glob = require('glob');
const jsonParser = require('./dcs-bios-json-parser');
const UdpClient = require('./udp-multicast-client');
const BufferReader = require('./buffer-reader');
const logger = require('./logger');

const MAX_DATA_SIZE = 65536;

class DcsBiosExportParser extends EventEmitter {
  constructor({ logLevel } = {}) {
    super();
    // Parse all the JSON files in the json folder.
    var files = glob.sync(path.resolve('./json/*.json'));
    this._aircraftJson = {};
    this._addressLookup = {};
    jsonParser.parseFiles(files, this._aircraftJson, this._addressLookup);
    // Create the UDP client.
    this._client = new UdpClient(config.get('udpClient'));
    // Create a buffer to hold all the incoming data from the DCS BIOS exporter. Although this buffer holds all the
    // data, it's mainly used to re-construct the entire string when there's only a partial string update.
    this._data = Buffer.alloc(MAX_DATA_SIZE);
    // Queue of controls that need to emit an update once we receive a sync command.
    this._emitQueue = [];
    // Set the log level. Can be changed later.
    this.setLogLevel(logLevel);

    this._client.on('message', (message) => {
      logger.trace('message received from client event:', message);
      this._parseMessage(message);
    });
  }

  startListening() {
    // Don't do anything if the UDP client is already listening.
    if (this._isListening) { return; }

    this._client.start();
    this._isListening = true;
  }

  stopListening() {
    // Don't do anything if the UDP client has already stopped listening.
    if (!this._isListening) { return; }

    this._client.stop();
    this._isListening = false;
  }

  get aircraftJson() {
    return this._aircraftJson;
  }

  getLogLevel() {
    return logger.config.level;
  }

  setLogLevel(level) {
    if (level) {
      logger.setLevel(level);
    }
  }

  _parseMessage(message) {
    var reader = new BufferReader(message);

    if (reader.length < 4) {
      logger.warn('incomplete message received: length is < 4');
      return;
    }

    // Go through each update block in the message.
    while (reader.position < message.length) {
      var address = reader.readUInt16LE();
      var count = reader.readUInt16LE();
      var controlAddress = address;
      logger.trace('address, count:', address, count);

      // EARLY OUT: If this is a sync, we're safe to tell the subscribers about the updates. Process the emit queue.
      if (address == 0x5555 && count == 0x5555) {
        this._processEmitQueue();
        continue;
      }
      else {
        while (count) {
          count = count - 2;
          var value = reader.readUInt16LE();
          this._data.writeUInt16LE(value, controlAddress);

          // Find the closest address that has a control. Need to do this because string updates can be partial updates
          // and the address that the exporter gives us will not correspond to a control in the address lookup.
          logger.trace('looking for closest address to', address);
          while (!this._addressLookup[controlAddress]) {
            controlAddress = controlAddress - 2;
          }
          logger.trace('closest address found at', controlAddress);

          // For each control in the address, process the value and add the control to the update queue.
          this._addressLookup[controlAddress].forEach((control) => {
            control.outputs.forEach((output) => {
              if (output.type == 'string') {
                // The value from the export can be just a partial string update. We need to get the entire string.
                var string = this._data.toString('utf8', controlAddress, controlAddress + output.max_length);
                value = string.trim().replace('\0', '');
              }
              else {
                value = (value & output.mask) >> output.shift_by;
              }

              // Don't add to the emit queue if the value hasn't changed, or if the emit queue already has the control
              // queued up for an emit.
              if (output.value != value && !this._emitQueue.includes(control)) {
                // Save the value on the output object.
                output.value = value;
                this._emitQueue.push({ output, control });
              }
            });
          });
        }
      }

      address = address + 2;
    }
  }

  _processEmitQueue() {
    logger.trace(`processing emit queue with ${this._emitQueue.length} item(s)`);
    this._emitQueue.forEach((item) => {
      var identifier = item.control.aircraftName + '/' + item.control.identifier + item.output.suffix;
      logger.trace('emit: ', identifier, item.output.value);
      this.emit(identifier, item.output.value, item.control, item.output);
    });

    this._emitQueue = [];
  }
}

module.exports = DcsBiosExportParser;
