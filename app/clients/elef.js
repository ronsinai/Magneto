const Axios = require('axios');
const Joi = require('joi');

const { diagnosisSchema } = require('../schemas');

module.exports = class Elef {
  constructor(url) {
    this.url = url;
  }

  // eslint-disable-next-line class-methods-use-this
  _getError(imaging, diagnosis) {
    return {
      imagingId: imaging._id,
      imagingType: imaging.type,
      diagnosis,
      error: true,
    };
  }

  async postDiagnosisError(imaging, diagnosis) {
    const diagnosisError = this._getError(imaging, diagnosis);
    Joi.assert(diagnosisError, diagnosisSchema);
    return await Axios.post(`${this.url}/diagnoses`, diagnosisError);
  }
};
