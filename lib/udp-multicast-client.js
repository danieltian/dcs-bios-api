const dgram = require('dgram');
const EventEmitter = require('events');
const config = require('config');
const logger = require('eazy-logger').Logger(config.get('udpClientLogger'));

class UdpMulticastClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
  }

  start() {
    this.client = dgram.createSocket('udp4');
    this.client.bind(this.config.receivePort);

    this.client.on('listening', () => {
      var address = this.client.address();
      logger.info(`UDP client listening on ${address.address}:${address.port}`);
      this.client.setBroadcast(true); //is this needed?
      this.client.addMembership(this.config.multicastAddress);
    });

    this.client.on('message', (message) => {
      this.emit('message', message);
      this.resetTimeout();
    });

    this.startTimeout();
  }

  startTimeout() {
    this.timeout = setTimeout(() => {
      logger.warn(`no data received in the last 10 seconds`);
    }, 10000);
  }

  resetTimeout() {
    clearTimeout(this.timeout);
    this.startTimeout();
  }

  sendMessage(message) {
    // TODO: test this to see if 127.0.0.1 is required, or if it can be 0.0.0.0 or 'localhost'
    this.client.send(message, 0, message.length, 7778, '127.0.0.1', (error) => {
      logger.error('could not send message:', error.message);
    });
  }
}

module.exports = UdpMulticastClient;
