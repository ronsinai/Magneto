const Joi = require('joi');
const Nconf = require('nconf');

const { diagnosisSchema } = require('../schemas');
const { Elef } = require('../clients');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

class DiagnosesService {
  constructor() {
    this.elef = new Elef(Nconf.get('ELEF_URI'));
  }

  async post(diagnosis) {
    try {
      Joi.assert(diagnosis, diagnosisSchema);
      logger.info(`Posting ${diagnosis.diagnosis} diagnosis of imaging ${diagnosis.imagingId} to 1000`);
      await this.elef.postDiagnosis(diagnosis);
      logger.info(`Posted ${diagnosis.diagnosis} diagnosis of imaging ${diagnosis.imagingId} to 1000`);
    }
    catch (err) {
      logger.error(`Failed to post ${diagnosis.diagnosis} diagnosis of imaging ${diagnosis.imagingId} to 1000`);
      throw err;
    }
  }
}

module.exports = DiagnosesService;
