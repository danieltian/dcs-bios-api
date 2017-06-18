const path = require('path');
const log = require('./logger');

/**
 * DCS BIOS JSON parser. Parses each aircraft's JSON data from the DCS BIOS project.
 */
class DcsBiosJsonParser {
  /**
   * Read and parse the DCS BIOS JSON files.
   * @param {Array} files - array of paths for each JSON file
   * @param {Object} aircraftData - object to put the raw data in
   * @param {Object} controls - object to add the controls to
   * @param {Object} addressLookup - address lookup object for looking up the controls associated with an address
   */
  static parseFiles(files, aircraftData = {}, controls = {}, addressLookup = {}) {
    files.forEach((file) => {
      // Get the aircraft name from the filename, the JSON data doesn't have the aircraft name in it.
      var aircraftName = path.basename(file, '.json');
      var json = require(file);
      aircraftData[aircraftName] = json;

      // Parse the aircraft's controls.
      this._parseJson(json, controls, addressLookup);
      log.info('parsed aircraft JSON -', aircraftName);
    });

    return { aircraftData, controls, addressLookup };
  }

  /**
   * Parse the JSON data and add the controls to the proper address in the address lookup object.
   * @param {Object} json - JSON data for a particular aircraft
   * @param {Object} controls - object to add the controls to in order to create a flat list of all controls
   * @param {Object} addressLookup - object to add the controls to by address
   */
  static _parseJson(json, controls, addressLookup) {
    // Aircraft data is structured as Category -> [Array of Controls] -> [Array of Outputs]. We need to go 2 levels deep
    // to get the outputs.
    this._getValues(json).forEach((category) => {
      // Process each category's controls.
      this._getValues(category).forEach((control) => {
        controls[control.identifier] = control;

        // Get the outputs for each control and add them to where they belong in the address lookup.
        control.outputs.forEach((output) => {
          // Create the array at the control's address if it doesn't exist.
          addressLookup[output.address] = addressLookup[output.address] || [];
          addressLookup[output.address].push(control);
        });
      });
    });
  }

  /**
   * Gets the value of each key in an object. Uses a polyfill if the Object.values() function does not exist.
   * @param {Object} object - object to get the values of each key for
   * @returns {Array} array of all the values in the object
   * @example
   * getValues({ a: '123', b: 456 });
   * // returns [ '123', 456 ]
   */
  static _getValues(object) {
    return Object.values ? Object.values(object) : Object.keys(object).map((key) => object[key]);
  }
}

module.exports = DcsBiosJsonParser;
