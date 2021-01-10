const Axios = require('axios');

module.exports = class Elef {
  constructor(url) {
    this.url = url;
  }

  async postDiagnosis(diagnosis) {
    return await Axios.post(`${this.url}/diagnoses`, diagnosis);
  }
};
