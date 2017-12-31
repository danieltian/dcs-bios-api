const dgram = require('dgram');
const EventEmitter = require('events');
const log = require('./logger');

/**
 * Wrapper class for a localhost UDP socket connection.
 */
class UdpMulticastClient extends EventEmitter {
  /**
   * UDP multicast client. Can send and receive messages.
   * @param {Object} options - config object that needs sendPort, receivePort, and multicastAddress properties
   * @example
   * new UdMulticastClient({ sendPort: 8080, receivePort: 8081, multicastAddress: '12.34.56.78' });
   */
  constructor({ sendPort, receivePort, multicastAddress } = {}) {
    super();
    this._sendPort = sendPort;
    this._receivePort = receivePort;
    this._multicastAddress = multicastAddress;
  }

  /**
   * Start the client and listen to messages sent to the multicast address on the receive port.
   * @returns {Promise} when start is finished and the client is listening
   */
  start() {
    var client = dgram.createSocket('udp4');
    client.bind(this._receivePort);
    this._client = client;

    // Echo out any messages received by the client.
    client.on('message', (message) => {
      this.emit('message', message);
    });

    // Return a promise that resolves once the UDP client is listening.
    return new Promise((resolve) => {
      client.on('listening', () => {
        var address = client.address();
        log.info(`UDP client listening on ${address.address}:${address.port}`);
        client.setBroadcast(true);
        client.addMembership(this._multicastAddress);
        resolve();
      });
    });
  }

  /**
   * Stop the client from listening.
   * @returns {Promise} when the stop is finished
   */
  stop() {
    return new Promise((resolve) => {
      this._client.close(() => {
        this._client = undefined;
        resolve();
      });
    });
  }

  /**
   * Send a message to the configured send port.
   * @param {string} message - message to send
   * @returns {Promise} when the send is finished
   * @example
   * sendMessage('test message\n');
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      this._client.send(message, this._sendPort, 'localhost', (error) => {
        if (error) { reject(error); }
        else { resolve(); }
      });
    });
  }
}

module.exports = UdpMulticastClient;
