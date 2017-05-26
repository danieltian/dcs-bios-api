class DcsBiosJsonParser {
  /**
   * DCS BIOS JSON parser. To be used with each aircraft's JSON data from the DCS BIOS project.
   * @param {Array} files - array of paths to the DCS BIO JSON files
   * @example
   * new DcsBiosJsonParser([ '../json/A10C.json', '../json/CommonData.json' ]);
   */
  constructor(files) {
    // Stores the raw data by aircraft name so you can do lookups, i.e. jsonData['A-10C'][Category][Control].
    this.jsonData = {};
    // Stores the address and the associated controls for that address.
    this.addressLookup = {};

    this.parseFiles(files, this.jsonData, this.addressLookup);
  }

  /**
   * Read and parse the DCS BIOS JSON files.
   * @param {Array} files - array of paths to the JSON files
   * @param {Object} dataObject - object to put the raw JSON data in, where the key is the aircraft name
   * @param {Object} lookupObject - address lookup object
   */
  parseFiles(files, dataObject, lookupObject) {
    files.forEach((file) => {
      var aircraftName = file.split('.');
      console.log('aircraft name', file, aircraftName)
      var json = require(file);
      dataObject[aircraftName] = json;

      this.parseJson(json, lookupObject);
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

  /**
   * Parse the JSON data to add the address ID to the lookup object.
   * @param {Object} json - JSON data to parse
   * @param {Object} lookupObject - object to add the parsed data to
   */
  parseJson(json, lookupObject) {
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
        if (!lookupObject[address]) {
          lookupObject[address] = [];
        }

        lookupObject[address].push(control);
      });
    });
  }
}

module.exports = DcsBiosJsonParser;
