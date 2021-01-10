const Joi = require('joi');
const Nconf = require('nconf');

const { imagingSchema } = require('../schemas');
const { Elef } = require('../clients');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

class DiagnosesService {
  constructor() {
    this.elef = new Elef(Nconf.get('ELEF_URI'));
  }

  async postError(imaging, diagnosis) {
    try {
      Joi.assert(imaging, imagingSchema);
      logger.info(`Posting ${diagnosis} diagnosis error of imaging ${imaging._id} to 1000`);
      await this.elef.postDiagnosisError(imaging, diagnosis);
      logger.info(`Posted ${diagnosis} diagnosis error of imaging ${imaging._id} to 1000`);
    }
    catch (err) {
      logger.error(`Failed to post ${diagnosis} diagnosis error of imaging ${imaging._id} to 1000`);
      throw err;
    }
  }
}

module.exports = DiagnosesService;
