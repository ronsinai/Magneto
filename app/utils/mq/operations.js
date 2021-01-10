const Joi = require('joi');

const { diagnosisSchema } = require('../../schemas');
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
    let diagnosis = {};
    let imagingId;

    try {
      diagnosis = JSON.parse(msg.content.toString());
      Joi.assert(diagnosis, diagnosisSchema);
      imagingId = diagnosis.imagingId;
      logger.info(`Consumed ${diagnosis.diagnosis} diagnosis of imaging ${imagingId}`);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_MSG_ERR);
      return logger.error(`Rejected ${diagnosis.diagnosis} diagnosis of imaging ${imagingId} with requeue=${this.REQUEUE_ON_MSG_ERR}`);
    }

    try {
      await this.diagnosesService.post(diagnosis);
    }
    catch (err) {
      logger.error(err);
      this.channel.reject(msg, this.REQUEUE_ON_SERVE_ERR);
      return logger.error(`Rejected ${diagnosis.diagnosis} diagnosis of imaging ${imagingId} with requeue=${this.REQUEUE_ON_SERVE_ERR}`);
    }

    this.channel.ack(msg);
    return logger.info(`Acked ${diagnosis.diagnosis} diagnosis of imaging ${imagingId}`);
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
