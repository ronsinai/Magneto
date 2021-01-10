const Nconf = require('nconf');

const { getLogger } = require('./utils/logger');
const MQ = require('./utils/mq');
const MQOperations = require('./utils/mq/operations');

const logger = getLogger();

class App {
  async start() {
    try {
      await this._connectToMQ();
    }
    catch (err) {
      logger.error(err);
      throw err;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async _connectToMQ() {
    await MQ.connect(Nconf.get('AMQP_URI'));
    logger.info(`Magneto-Imagings : connected to rabbitmq at ${Nconf.get('AMQP_URI')}`);

    await MQ.setUp(
      Nconf.get('AMQP_EXCHANGE'),
      Nconf.get('AMQP_EXCHANGE_TYPE'),
      Nconf.get('AMQP_QUEUE'),
      Nconf.get('AMQP_PATTERNS').split(' '),
    );

    this.mq = new MQOperations(Nconf.get('AMQP_QUEUE'));

    logger.info(
      `Magneto-Imagings : `
      + `consuming from ${Nconf.get('AMQP_EXCHANGE')} exchange through ${Nconf.get('AMQP_QUEUE')} queue `
      + `with patterns: ['${Nconf.get('AMQP_PATTERNS').split(' ').join("', '")}']`,
    );
    await this.mq.consume();
  }

  // eslint-disable-next-line class-methods-use-this
  async _closeMQConnection() {
    await MQ.close();
    logger.info(`Magneto-Imagings : disconnected from rabbitmq at ${Nconf.get('AMQP_URI')}`);
  }

  async stop() {
    try {
      await this._closeMQConnection();
    }
    catch (err) {
      logger.error(err);
      throw err;
    }
    logger.info(`Magneto-Imagings : shutting down`);
  }
}

module.exports = App;
