const Chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Sinon = require('sinon');
const SinonChai = require('sinon-chai');

Chai.use(chaiAsPromised);
Chai.use(SinonChai);
const { expect } = Chai;

const exampleDiagnosis = require('../data/diagnosis');
const { getMessage } = require('../utils/mq');

describe('Consumer', () => {
  before(() => {
    this.requeue_on_reject = false;

    this.exampleDiagnosis = exampleDiagnosis;
    this.badDiagnosis = { imagingId: 'partial' };

    this.mq = global.consumerInstance.mq;

    this.channel = this.mq.channel;
    this.diagnosesService = this.mq.diagnosesService;

    this.elef = this.diagnosesService.elef;
  });

  beforeEach(() => {
    this.diagnosesServiceSpy = Sinon.spy(this.diagnosesService, 'post');

    this.ackStub = Sinon.stub(this.channel, 'ack');
    this.elefStub = Sinon.stub(this.elef, 'postDiagnosis');
    this.rejectStub = Sinon.stub(this.channel, 'reject');
  });

  afterEach(() => {
    this.diagnosesServiceSpy.restore();

    this.ackStub.restore();
    this.elefStub.restore();
    this.rejectStub.restore();
  });

  describe('Diagnoses Service', () => {
    describe('#post', () => {
      it('should post diagnosis', async () => {
        await this.diagnosesService.post(this.exampleDiagnosis);
        expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleDiagnosis);
      });

      it('should fail when given partial diagnosis', async () => {
        await expect(this.diagnosesService.post(this.badDiagnosis)).to.be.rejectedWith('"imagingType" is required');
      });

      it('should fail when client is unreachable', async () => {
        this.elefStub.restore();
        const elefSpy = Sinon.spy(this.elef, 'postDiagnosis');

        const fakeElefUrl = '127.0.0.1:80';
        const originalElefUrl = this.elef.url;
        this.elef.url = `http://${fakeElefUrl}`;

        await expect(this.diagnosesService.post(this.exampleDiagnosis)).to.be.rejectedWith(`connect ECONNREFUSED ${fakeElefUrl}`);
        expect(elefSpy).to.have.been.calledOnceWithExactly(this.exampleDiagnosis);
        this.elef.url = originalElefUrl;
        elefSpy.restore();
      });
    });
  });

  describe('Message Handler', () => {
    it('should ack when given proper message', async () => {
      const msg = getMessage(this.exampleDiagnosis);
      await this.mq._msgHandler(msg);

      expect(this.diagnosesServiceSpy).to.have.been.calledOnceWithExactly(this.exampleDiagnosis);
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleDiagnosis);
      expect(this.ackStub).to.have.been.calledOnceWithExactly(msg);
      // eslint-disable-next-line no-unused-expressions
      expect(this.rejectStub).to.have.not.been.called;
    });

    it('should reject with no requeue when given improper message', async () => {
      const msg = getMessage(this.badDiagnosis);
      await this.mq._msgHandler(msg);

      // eslint-disable-next-line no-unused-expressions
      expect(this.diagnosesServiceSpy).to.have.not.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(this.elefStub).to.have.not.been.called;
      // eslint-disable-next-line no-unused-expressions
      expect(this.ackStub).to.have.not.been.called;
      expect(this.rejectStub).to.have.been.calledOnceWithExactly(msg, this.requeue_on_reject);
    });

    it('should reject with requeue proper message when fails to post diagnosis', async () => {
      const msg = getMessage(this.exampleDiagnosis);

      this.elefStub.restore();
      this.elefStub = Sinon.stub(this.elef, 'postDiagnosis').throws();

      await this.mq._msgHandler(msg);

      expect(this.diagnosesServiceSpy).to.have.been.calledOnceWithExactly(this.exampleDiagnosis);
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleDiagnosis);
      // eslint-disable-next-line no-unused-expressions
      expect(this.ackStub).to.have.not.been.called;
      expect(this.rejectStub).to.have.been.calledOnceWithExactly(msg, true);
    });
  });
});
