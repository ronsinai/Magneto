const Axios = require('axios');

module.exports = class Elef {
  constructor(url) {
    this.url = url;
  }

  async postImaging(imaging) {
    return await Axios.post(`${this.url}/imagings`, imaging);
  }
};
