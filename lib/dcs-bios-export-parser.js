const EventEmitter = require('events');
const path = require('path');
const glob = require('glob');
const jsonParser = require('./dcs-bios-json-parser');
const UdpClient = require('./udp-multicast-client');
const BufferReader = require('buffer-utils').BufferReader;
const log = require('./logger');

const MAX_DATA_SIZE = 65536;
const defaultOptions = {
  receivePort: 5010,
  sendPort: 7778,
  multicastAddress: '239.255.50.10',
  emitAllUpdates: false,
  logLevel: 'NONE'
};

class DcsBiosExportParser extends EventEmitter {
  /**
   * DCS BIOS export data parser. Takes messages emitted from the UDP client and parses them.
   * @param {Object} options - configuration options
   * @example
   * // possible options and their defaults
   * new DcsBiosExportParser({
   *   receivePort: 5010,
   *   sendPort: 7778,
   *   multicastAddress: '239.255.50.10',
   *   emitAllUpdates: false,
   *   logLevel: 'NONE'
   * });
   */
  constructor(options = {}) {
    super();
    this._options = Object.assign(defaultOptions, options);
    this.setLogLevel(this._options.logLevel);
    // Parse all the JSON files in the json folder.
    var files = glob.sync(path.join(__dirname, '/../json/*.json'));
    this._aircraftJson = {};
    this._addressLookup = {};
    jsonParser.parseFiles(files, this._aircraftJson, this._addressLookup);
    // Create the UDP client.
    this._client = new UdpClient(this._options);
    // Create a buffer to hold all the incoming data from the DCS BIOS exporter. Although this buffer holds all the
    // data, it's mainly used to re-construct strings when there's only a partial string update.
    this._data = Buffer.alloc(MAX_DATA_SIZE);
    // Queue of controls that need to emit an update once we receive a sync command.
    this._emitQueue = [];

    this._client.on('message', (message) => {
      this._parseMessage(message);
    });
  }

  /**
   * Start listening for new UDP messages from the DCS BIOS exporter.
   */
  startListening() {
    // Don't do anything if the UDP client is already listening.
    if (this._isListening) { return; }

    return this._client.start().then(() => this._isListening = true);
  }

  /**
   * Stop listening for new UDP messages from the DCS BIOS exporter.
   */
  stopListening() {
    // Don't do anything if the UDP client has already stopped listening.
    if (!this._isListening) { return; }

    return this._client.stop().then(() => this._isListening = false);
  }

  /**
   * Get the value of a control.
   * @param {string} aircraft - aircraft name
   * @param {string} category - category name
   * @param {string} control - control identifier
   * @param {string} outputSuffix - output suffix, if the control has more than one output
   * @returns {string|Number} value of the control that was requested
   */
  getControlValue(aircraft, category, control, outputSuffix) {
    var json = this._aircraftJson;
    var controlObject = json[aircraft] && json[aircraft][category] && json[aircraft][category][control];
    // If no control object was found, return undefined.
    if (!controlObject) {
      return undefined;
    }
    // If the control only has one output, return its value.
    if (controlObject.outputs.length == 1) {
      return controlObject.outputs[0].value;
    }
    // If the control has more than one output, return the value of the one with the provided suffix.
    var output = controlObject.outputs.find((output) => output.suffix == outputSuffix);
    return output ? output.value : undefined;
  }

  /**
   * Get the aircraft JSON. Contains every aircraft with its categories, controls, and outputs.
   * @returns {Object} aircraft JSON object
   */
  get aircraftJson() {
    return this._aircraftJson;
  }

  /**
   * Set the logging level.
   * @param {String} level - log level
   */
  setLogLevel(level) {
    log.setLogLevel(level);
  }

  /**
   * Send a message to the DCS BIOS importer.
   */
  sendMessage(message) {
    return this._client.sendMessage(message);
  }

  /** Parse the DCS BIOS export message from the UDP client.
   * @param {Buffer} message - DCS BIOS export message
   */
  _parseMessage(message) {
    var reader = new BufferReader(message);

    if (reader.bytesLeft() < 4) {
      log.warn('incomplete message received: length is < 4');
      return;
    }

    // Go through each update block in the message.
    while (reader.bytesLeft()) {
      var address = reader.readUInt16LE();
      var count = reader.readUInt16LE();

      // EARLY OUT: If this is a sync, we're safe to tell the subscribers about the updates. Process the emit queue.
      if (address == 0x5555 && count == 0x5555) {
        this._processEmitQueue();
        continue;
      }
      else {
        while (count) {
          var controlAddress = address;
          var addressValue = reader.readUInt16LE();
          count = count - 2;
          address = address + 2;
          this._data.writeUInt16LE(addressValue, controlAddress);

          // Find the closest address that has a control. Need to do this because string updates can be partial updates
          // and the address that the exporter gives us will not correspond to a control in the address lookup.
          while (!this._addressLookup[controlAddress]) {
            controlAddress = controlAddress - 2;
          }

          // For each control in the address, process the value and add the control to the update queue.
          this._addressLookup[controlAddress].forEach((control) => {
            control.outputs.forEach((output) => {
              var controlValue;

              if (output.type == 'string') {
                controlValue = this._data.toString('utf8', controlAddress, controlAddress + output.max_length);
              }
              else {
                controlValue = (addressValue & output.mask) >> output.shift_by;
              }

              var valueHasChanged = (this._options.emitAllUpdates || output.value != controlValue);
              var isAlreadyAdded = this._emitQueue.some((item) => item.control == control && item.output == output);

              // Don't add to the emit queue if the value hasn't changed (can be overriden by emitAllUpdates), or if the
              // emit queue already has the control and output queued up for an emit.
              if (valueHasChanged && !isAlreadyAdded) {
                // Save the value on the output object.
                output.value = controlValue;
                this._emitQueue.push({ output, control });
              }
            });
          });
        }
      }
    }
  }

  /**
   * Process the controls that need to trigger events.
   */
  _processEmitQueue() {
    // Emit all the updated controls. Useful if someone wants all the updates.
    this.emit('update', this._emitQueue);
    // Emit each updated control as a separate event. Useful if someone only cares about a single control.
    this._emitQueue.forEach((item) => {
      var identifier = item.control.identifier + item.output.suffix;
      log.debug('emit:', identifier, item.output.value);
      this.emit(identifier, item.output.value, item.control, item.output);
    });

    this._emitQueue = [];
  }
}

module.exports = DcsBiosExportParser;
