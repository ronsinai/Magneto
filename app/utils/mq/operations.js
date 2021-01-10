const Joi = require('joi');

const { imagingSchema } = require('../../schemas');
const { ImagingsService } = require('../../services');
const { getLogger } = require('../logger');
const { getMQ } = require('.');

const logger = getLogger();

class MQOperations {
  constructor(inQueue) {
    this.channel = getMQ();
    this.imagingsService = new ImagingsService();

    this.inQueue = inQueue;

    this.NO_ACK = false;
    this.REQUEUE_ON_MSG_ERR = false;
    this.REQUEUE_ON_SERVE_ERR = true;
  }

  async _msgHandler(msg) {
    let imaging = {};

    try {
      imaging = JSON.parse(msg.content.toString());
      Joi.assert(imaging, imagingSchema);
      logger.info(`Consumed imaging ${imaging._id}`);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_MSG_ERR);
      return logger.error(`Rejected imaging ${imaging._id} with requeue=${this.REQUEUE_ON_MSG_ERR}`);
    }

    try {
      await this.imagingsService.post(imaging);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_SERVE_ERR);
      return logger.error(`Rejected imaging ${imaging._id} with requeue=${this.REQUEUE_ON_SERVE_ERR}`);
    }

    this.channel.ack(msg);
    return logger.info(`Acked imaging ${imaging._id}`);
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
