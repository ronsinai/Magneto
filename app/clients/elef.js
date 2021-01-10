const Axios = require('axios');

module.exports = class Elef {
  constructor(url) {
    this.url = url;
  }

  async putDischarge(imagingId) {
    return await Axios.put(`${this.url}/imagings/${imagingId}/discharge`);
  }
};
