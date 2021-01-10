const Chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Sinon = require('sinon');
const SinonChai = require('sinon-chai');

Chai.use(chaiAsPromised);
Chai.use(SinonChai);
const { expect } = Chai;

const exampleImaging = require('../data/imaging');
const { getMessage } = require('../utils/mq');

describe('Consumer', () => {
  before(() => {
    this.requeue_on_reject = false;

    this.exampleImaging = exampleImaging;
    this.badImaging = { _id: 'partial' };

    this.mq = global.consumerInstance.mq;

    this.channel = this.mq.channel;
    this.imagingsService = this.mq.imagingsService;

    this.elef = this.imagingsService.elef;
  });

  beforeEach(() => {
    this.imagingsServiceSpy = Sinon.spy(this.imagingsService, 'post');

    this.ackStub = Sinon.stub(this.channel, 'ack');
    this.elefStub = Sinon.stub(this.elef, 'postImaging');
    this.rejectStub = Sinon.stub(this.channel, 'reject');
  });

  afterEach(() => {
    this.imagingsServiceSpy.restore();

    this.ackStub.restore();
    this.elefStub.restore();
    this.rejectStub.restore();
  });

  describe('Imagings Service', () => {
    describe('#post', () => {
      it('should post imaging', async () => {
        await this.imagingsService.post(this.exampleImaging);
        expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImaging);
      });

      it('should fail when given partial imaging', async () => {
        await expect(this.imagingsService.post(this.badImaging)).to.be.rejectedWith('"type" is required');
      });

      it('should fail when client is unreachable', async () => {
        this.elefStub.restore();
        const elefSpy = Sinon.spy(this.elef, 'postImaging');

        const fakeElefUrl = '127.0.0.1:80';
        const originalElefUrl = this.elef.url;
        this.elef.url = `http://${fakeElefUrl}`;

        await expect(this.imagingsService.post(this.exampleImaging)).to.be.rejectedWith(`connect ECONNREFUSED ${fakeElefUrl}`);
        expect(elefSpy).to.have.been.calledOnceWithExactly(this.exampleImaging);
        this.elef.url = originalElefUrl;
        elefSpy.restore();
      });
    });
  });

  describe('Message Handler', () => {
    it('should ack when given proper message', async () => {
      const msg = getMessage(this.exampleImaging);
      await this.mq._msgHandler(msg);

      expect(this.imagingsServiceSpy).to.have.been.calledOnceWithExactly(this.exampleImaging);
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImaging);
      expect(this.ackStub).to.have.been.calledOnceWithExactly(msg);
      // eslint-disable-next-line no-unused-expressions
      expect(this.rejectStub).to.have.not.been.called;
    });

    it('should reject with no requeue when given improper message', async () => {
      const msg = getMessage(this.badImaging);
      await this.mq._msgHandler(msg);

      // eslint-disable-next-line no-unused-expressions
      expect(this.imagingsServiceSpy).to.have.not.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(this.elefStub).to.have.not.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(this.ackStub).to.have.not.been.called;
      expect(this.rejectStub).to.have.been.calledOnceWithExactly(msg, this.requeue_on_reject);
    });

    it('should reject with requeue proper message when fails to post imaging', async () => {
      const msg = getMessage(this.exampleImaging);

      this.elefStub.restore();
      this.elefStub = Sinon.stub(this.elef, 'postImaging').throws();

      await this.mq._msgHandler(msg);

      expect(this.imagingsServiceSpy).to.have.been.calledOnceWithExactly(this.exampleImaging);
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImaging);
      // eslint-disable-next-line no-unused-expressions
      expect(this.ackStub).to.have.not.been.called;
      expect(this.rejectStub).to.have.been.calledOnceWithExactly(msg, true);
    });
  });
});
