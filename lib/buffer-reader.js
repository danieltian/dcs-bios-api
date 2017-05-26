// Buffer reader class. Allows reading of a buffer without having to manually maintain the position.
class BufferReader {
  /**
   * Convenience class to read a buffer. Allows reading a buffer like a stream without having to manually maintain the
   * position.
   * @param {Buffer} buffer - the buffer to read
   */
  constructor(buffer) {
    this.buffer = buffer;
    this.position = 0;
  }

  readUInt16LE() {
    var value = this.buffer.readUInt16LE(this.position);
    this.position = this.position + 2;
    return value;
  }

  readUInt32LE() {
    var value = this.buffer.readUInt32LE(this.position);
    this.position = this.position + 4;
    return value;
  }

  get length() {
    return this.buffer.length;
  }
}

module.exports = BufferReader;
