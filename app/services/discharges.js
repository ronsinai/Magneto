const Nconf = require('nconf');

const { Elef } = require('../clients');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

class DischargesService {
  constructor() {
    this.elef = new Elef(Nconf.get('ELEF_URI'));
  }

  async put(imagingId) {
    try {
      logger.info(`Discharging imaging ${imagingId} to 1000`);
      await this.elef.putDischarge(imagingId);
      logger.info(`Discharged imaging ${imagingId} to 1000`);
    }
    catch (err) {
      logger.error(`Failed to discharge imaging ${imagingId} to 1000`);
      throw err;
    }
  }
}

module.exports = DischargesService;
