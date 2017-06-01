const dgram = require('dgram');
const EventEmitter = require('events');
const log = require('./logger');

class UdpMulticastClient extends EventEmitter {
  /**
   * UDP multicast client. Can send and receive messages.
   * @param {Object} options - config object that needs sendPort, receivePort, and multicastAddress properties
   * @example
   * new UdMulticastClient({ sendPort: 8080, receivePort: 8081, multicastAddress: '12.34.56.78' });
   */
  constructor(options = {}) {
    super();
    this._options = options;
  }

  /**
   * Start the client and listen to messages sent to the multicast address on the configured receive port.
   */
  start() {
    this.client = dgram.createSocket('udp4');
    this.client.bind(this._options.receivePort);

    this.client.on('message', (message) => {
      this.emit('message', message);
    });

    return new Promise((resolve) => {
      this.client.on('listening', () => {
        var address = this.client.address();
        log.info(`UDP client listening on ${address.address}:${address.port}`);
        this.client.setBroadcast(true);
        this.client.addMembership(this._options.multicastAddress);
        resolve();
      });
    });
  }

  /**
   * Stop the client from listening.
   */
  stop() {
    return new Promise((resolve) => {
      this.client.close(() => {
        this.client = undefined;
        resolve();
      });
    });
  }

  /**
   * Send a message to the configured send port.
   * @param {string} message - message to send
   * @example
   * sendMessage('test message\n');
   */
  sendMessage(message) {
    // TODO: test this to see if 127.0.0.1 is required, or if it can be 0.0.0.0 or 'localhost'
    return new Promise((resolve, reject) => {
      this.client.send(message, this._options.sendPort, '127.0.0.1', (error) => {
        if (error) { reject(error); }
        else { resolve(); }
      });
    });
  }
}

module.exports = UdpMulticastClient;
