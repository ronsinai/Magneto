const Chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Sinon = require('sinon');
const SinonChai = require('sinon-chai');

Chai.use(chaiAsPromised);
Chai.use(SinonChai);
const { expect } = Chai;

const { getMessage } = require('../utils/mq');

describe('Consumer', () => {
  before(() => {
    this.requeue_on_reject = false;

    this.exampleImagingId = 'M31';
    this.badImagingId = null;

    this.mq = global.consumerInstance.mq;

    this.channel = this.mq.channel;
    this.dischargesService = this.mq.dischargesService;

    this.elef = this.dischargesService.elef;
  });

  beforeEach(() => {
    this.dischargesServiceSpy = Sinon.spy(this.dischargesService, 'put');

    this.ackStub = Sinon.stub(this.channel, 'ack');
    this.elefStub = Sinon.stub(this.elef, 'putDischarge');
    this.rejectStub = Sinon.stub(this.channel, 'reject');
  });

  afterEach(() => {
    this.dischargesServiceSpy.restore();

    this.ackStub.restore();
    this.elefStub.restore();
    this.rejectStub.restore();
  });

  describe('Discharges Service', () => {
    describe('#put', () => {
      it('should put discharge', async () => {
        await this.dischargesService.put(this.exampleImagingId);
        expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImagingId);
      });

      it('should fail when client is unreachable', async () => {
        this.elefStub.restore();
        const elefSpy = Sinon.spy(this.elef, 'putDischarge');

        const fakeElefUrl = '127.0.0.1:80';
        const originalElefUrl = this.elef.url;
        this.elef.url = `http://${fakeElefUrl}`;

        await expect(this.dischargesService.put(this.exampleImagingId)).to.be.rejectedWith(`connect ECONNREFUSED ${fakeElefUrl}`);
        expect(elefSpy).to.have.been.calledOnceWithExactly(this.exampleImagingId);
        this.elef.url = originalElefUrl;
        elefSpy.restore();
      });
    });
  });

  describe('Message Handler', () => {
    it('should ack when given proper message', async () => {
      const msg = getMessage(this.exampleImagingId);
      await this.mq._msgHandler(msg);

      expect(this.dischargesServiceSpy).to.have.been.calledOnceWithExactly(this.exampleImagingId);
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImagingId);
      expect(this.ackStub).to.have.been.calledOnceWithExactly(msg);
      // eslint-disable-next-line no-unused-expressions
      expect(this.rejectStub).to.have.not.been.called;
    });

    it('should reject with no requeue when given improper message', async () => {
      const msg = this.badImagingId;
      await this.mq._msgHandler(msg);

      // eslint-disable-next-line no-unused-expressions
      expect(this.dischargesServiceSpy).to.have.not.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(this.elefStub).to.have.not.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(this.ackStub).to.have.not.been.called;
      expect(this.rejectStub).to.have.been.calledOnceWithExactly(msg, this.requeue_on_reject);
    });

    it('should reject with requeue proper message when fails to put discharge', async () => {
      const msg = getMessage(this.exampleImagingId);

      this.elefStub.restore();
      this.elefStub = Sinon.stub(this.elef, 'putDischarge').throws();

      await this.mq._msgHandler(msg);

      expect(this.dischargesServiceSpy).to.have.been.calledOnceWithExactly(this.exampleImagingId);
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImagingId);
      // eslint-disable-next-line no-unused-expressions
      expect(this.ackStub).to.have.not.been.called;
      expect(this.rejectStub).to.have.been.calledOnceWithExactly(msg, true);
    });
  });
});
