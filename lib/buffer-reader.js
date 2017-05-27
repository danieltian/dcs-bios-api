class BufferReader {
  /**
   * Convenience class to read a buffer. Allows reading a buffer like a stream without having to manually maintain the
   * read position.
   * @param {Buffer} buffer - the buffer to read
   */
  constructor(buffer) {
    this.buffer = buffer;
    this.position = 0;
  }

  /**
   * Read a little endian unsigned word from the buffer. Advances the buffer position by 2 bytes.
   * @returns {Number} value of the Int16LE at the current buffer position
   * @example
   * bufferReader.readUInt16LE(Buffer.from([0x01, 0x02, 0x03, 0x04]));
   * // returns 513, or 0x0201
   */
  readUInt16LE() {
    var value = this.buffer.readUInt16LE(this.position);
    this.position = this.position + 2;
    return value;
  }

  /**
   * Read a little endian unsigned long from the buffer. Advances the buffer position by 4 bytes.
   * @returns {Number} value of the Int32LE at the current buffer position
   * @example
   * bufferReader.readUInt32LE(Buffer.from([0x01, 0x02, 0x03, 0x04]));
   * // returns 67305985, or 0x04030201
   */
  readUInt32LE() {
    var value = this.buffer.readUInt32LE(this.position);
    this.position = this.position + 4;
    return value;
  }

  /**
   * Get the length of the underlying buffer in bytes.
   * @returns {Number} length of the buffer in bytes
   */
  get length() {
    return this.buffer.length;
  }
}

module.exports = BufferReader;
