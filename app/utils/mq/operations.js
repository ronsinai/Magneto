const { DischargesService } = require('../../services');
const { getLogger } = require('../logger');
const { getMQ } = require('.');

const logger = getLogger();

class MQOperations {
  constructor(inQueue) {
    this.channel = getMQ();
    this.dischargesService = new DischargesService();

    this.inQueue = inQueue;

    this.NO_ACK = false;
    this.REQUEUE_ON_MSG_ERR = false;
    this.REQUEUE_ON_SERVE_ERR = true;
  }

  async _msgHandler(msg) {
    let imagingId;

    try {
      imagingId = JSON.parse(msg.content.toString());
      logger.info(`Consumed discharge of imaging ${imagingId}`);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_MSG_ERR);
      return logger.error(`Rejected discharge of imaging ${imagingId} with requeue=${this.REQUEUE_ON_MSG_ERR}`);
    }

    try {
      await this.dischargesService.put(imagingId);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_SERVE_ERR);
      return logger.error(`Rejected discharge of imaging ${imagingId} with requeue=${this.REQUEUE_ON_SERVE_ERR}`);
    }

    this.channel.ack(msg);
    return logger.info(`Acked discharge of imaging ${imagingId}`);
  }

  async consume() {
    await this.channel.consume(
      this.inQueue,
      this._msgHandler.bind(this),
      { noAck: this.NO_ACK },
    );
  }
}

module.exports = MQOperations;
