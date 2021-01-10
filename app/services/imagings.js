const Joi = require('joi');
const Nconf = require('nconf');

const { imagingSchema } = require('../schemas');
const { Elef } = require('../clients');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

class ImagingsService {
  constructor() {
    this.elef = new Elef(Nconf.get('ELEF_URI'));
  }

  async post(imaging) {
    try {
      Joi.assert(imaging, imagingSchema);
      logger.info(`Posting imaging ${imaging._id} to 1000`);
      await this.elef.postImaging(imaging);
      logger.info(`Posted imaging ${imaging._id} to 1000`);
    }
    catch (err) {
      logger.error(`Failed to post imaging ${imaging._id} to 1000`);
      throw err;
    }
  }
}

module.exports = ImagingsService;
