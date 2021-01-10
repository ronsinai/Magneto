const Joi = require('joi');

const { imagingSchema } = require('../../schemas');
const { DiagnosesService } = require('../../services');
const { getLogger } = require('../logger');
const { getMQ } = require('.');

const logger = getLogger();

class MQOperations {
  constructor(inQueue) {
    this.channel = getMQ();
    this.diagnosesService = new DiagnosesService();

    this.inQueue = inQueue;

    this.NO_ACK = false;
    this.REQUEUE_ON_MSG_ERR = false;
    this.REQUEUE_ON_SERVE_ERR = true;
  }

  async _msgHandler(msg) {
    let imaging = {};
    let imagingId;
    let diagnosis;

    try {
      imaging = JSON.parse(msg.content.toString());
      Joi.assert(imaging, imagingSchema);
      imagingId = imaging._id;
      diagnosis = msg.fields.routingKey;
      logger.info(`Consumed ${diagnosis} diagnosis error of imaging ${imagingId}`);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_MSG_ERR);
      return logger.error(`Rejected ${diagnosis} diagnosis error of imaging ${imagingId} with requeue=${this.REQUEUE_ON_MSG_ERR}`);
    }

    try {
      await this.diagnosesService.postError(imaging, diagnosis);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_SERVE_ERR);
      return logger.error(`Rejected ${diagnosis} diagnosis error of imaging ${imagingId} with requeue=${this.REQUEUE_ON_SERVE_ERR}`);
    }

    this.channel.ack(msg);
    return logger.info(`Acked ${diagnosis} diagnosis error of imaging ${imagingId}`);
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
