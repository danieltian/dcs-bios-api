const dgram = require('dgram');
const EventEmitter = require('events');
const logger = require('./logger');

class UdpMulticastClient extends EventEmitter {
  /**
   * UDP multicast client. Can send and receive messages.
   * @param {Object} config - config object that needs sendPort, receivePort, and multicastAddress properties
   * @example
   * new UdMulticastClient({ sendPort: 8080, receivePort: 8081, multicastAddress: '12.34.56.78' });
   */
  constructor(config = {}) {
    super();
    this.config = config;
  }

  /**
   * Start the client and listen to messages sent to the multicast address on the configured receive port.
   */
  start() {
    this.client = dgram.createSocket('udp4');

    this.client.on('listening', () => {
      var address = this.client.address();
      logger.info(`UDP client listening on ${address.address}:${address.port}`);
      this.client.setBroadcast(true);
      this.client.addMembership(this.config.multicastAddress);
    });

    this.client.on('message', (message) => {
      logger.trace('UDP message received:', message);
      this.emit('message', message);
    });

    this.client.bind(this.config.receivePort);
  }

  /**
   * Stop the client from listening.
   */
  stop() {
    this.client.stop();
    // Remove the reference to the client object so that the GC will clean it up automatically and we don't have to
    // manually remove the listeners.
    this.client = undefined;
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
      this.client.send(message, 7778, '127.0.0.1', (error) => {
        if (error) {
          logger.error('could not send message:', error.message);
          reject(error);
        }
        else {
          resolve();
        }
      });
    });
  }
}

module.exports = UdpMulticastClient;
