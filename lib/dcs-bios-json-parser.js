const path = require('path');
const config = require('config');
const logger = require('eazy-logger').Logger(config.get('dcsBiosJsonParserLogger'));

/**
 * DCS BIOS JSON parser. To be used with each aircraft's JSON data from the DCS BIOS project.
 */
class DcsBiosJsonParser {
  /**
   * Read and parse the DCS BIOS JSON files.
   * @param {Array} files - array of paths to the JSON files
   * @param {Object} aircraftJson - object to put the raw JSON data in, where the key is the aircraft name
   * @param {Object} addressLookup - address lookup object
   */
  parseFiles(files, aircraftJson = {}, addressLookup = {}) {
    files.forEach((file) => {
      var aircraftName = path.basename(file, '.json');
      var json = require(file);
      aircraftJson[aircraftName] = json;

      this.parseJson(json, addressLookup);
      logger.info('parsed aircraft', aircraftName);
    });

    return { aircraftJson, addressLookup };
  }

  /**
   * Parse the JSON data to add the address ID to the lookup object.
   * @param {Object} json - JSON data to parse
   * @param {Object} addressLookup - object to add the parsed data to
   */
  parseJson(json, addressLookup) {
    // Aircraft data is structured as Category -> [Array of Controls] -> [Array of Outputs]. We first flatten the array
    // into a flat list of controls.
    var controls = this._getValues(json).reduce((array, category) => {
      Array.prototype.push.apply(array, this._getValues(category));
      return array;
    }, []);

    // Next, get the outputs for each control and add them to where they belong in the address lookup.
    controls.forEach((control) => {
      // It's possible for there to be more than one output, in which case each output will have a suffix.
      control.outputs.forEach((output) => {
        // If the output is a string, create a buffer for its value.
        if (output.type == 'string') {
          output.value = Buffer.alloc(output.max_length);
        }

        var address = output.address;
        // Create the controls array if it doesn't exist.
        if (!addressLookup[address]) {
          addressLookup[address] = [];
        }

        addressLookup[address].push(control);
      });
    });
  }

  /**
   * Gets the value of each key in an object. Use a polyfill for Object.values() if the function doesn't exist.
   * @param {Object} object - object to get the values of each key for
   * @returns {Array} array of all the values in the object
   * @example
   * getValues({ a: '123', b: 456 });
   * // returns [ '123', 456 ]
   */
  _getValues(object) {
    return !!Object.values ? Object.values(object) : Object.keys(object).map((key) => object[key]);
  }
}

module.exports = DcsBiosJsonParser;
