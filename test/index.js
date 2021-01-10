const Nconf = require('nconf');

Nconf.use('memory');
Nconf.argv().env().defaults({
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  ELEF_URI: 'http://localhost:1995',
  AMQP_URI: 'amqp://localhost:5672',
  AMQP_EXCHANGE: 'test_imagings',
  AMQP_EXCHANGE_TYPE: 'topic',
  AMQP_QUEUE: 'test_imagings',
  AMQP_PATTERNS: '#',
});

const Consumer = require('../app');

before(async () => {
  global.consumerInstance = new Consumer();
  await global.consumerInstance.start();
});

after(async () => {
  await global.consumerInstance.stop();
});
