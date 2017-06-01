const path = require('path');
const log = require('./logger');

/**
 * DCS BIOS JSON parser. To be used with each aircraft's JSON data from the DCS BIOS project.
 */
class DcsBiosJsonParser {
  /**
   * Read and parse the DCS BIOS JSON files.
   * @param {Array} files - array of paths for each JSON file
   * @param {Object} aircraftJson - object to put the raw JSON data in, where the key is the aircraft name
   * @param {Object} addressLookup - address lookup object, to get the controls associated with a certain address
   */
  static parseFiles(files, aircraftJson = {}, addressLookup = {}) {
    files.forEach((file) => {
      // Get the aircraft name from the filename, the JSON data doesn't have the aircraft name.
      var aircraftName = path.basename(file, '.json');
      var json = require(file);
      aircraftJson[aircraftName] = json;

      this.parseJson(aircraftName, json, addressLookup);
      log.info('parsed aircraft JSON -', aircraftName);
    });

    return { aircraftJson, addressLookup };
  }

  /**
   * Parse the JSON data and add the controls to the correct address in the address lookup object.
   * @param {string} aircraftName - name of the aircraft, will be added to each control as the aircraftName property
   * @param {Object} json - JSON data to parse
   * @param {Object} addressLookup - object to add the controls to
   */
  static parseJson(aircraftName, json, addressLookup) {
    // Aircraft data is structured as Category -> [Array of Controls] -> [Array of Outputs]. We first flatten the array
    // into a flat list of controls.
    var controls = this._getValues(json).reduce((array, category) => {
      Array.prototype.push.apply(array, this._getValues(category));
      return array;
    }, []);

    // Next, get the outputs for each control and add them to where they belong in the address lookup.
    controls.forEach((control) => {
      control.aircraftName = aircraftName;

      control.outputs.forEach((output) => {
        // Create the array at the control's address if it doesn't exist.
        addressLookup[output.address] = addressLookup[output.address] || [];
        addressLookup[output.address].push(control);
      });
    });
  }

  /**
   * Gets the value of each key in an object. Uses a polyfill for Object.values() if the function doesn't exist.
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
