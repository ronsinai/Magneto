const Axios = require('axios');
const Chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Nconf = require('nconf');
const Sinon = require('sinon');
const SinonChai = require('sinon-chai');

Chai.use(chaiAsPromised);
Chai.use(SinonChai);
const { expect } = Chai;

const { exampleDiagnosis, exampleImaging } = require('../data');
const { getMessage } = require('../utils/mq');

describe('Consumer', () => {
  before(() => {
    this.requeue_on_reject = false;

    this.exampleDiagnosis = exampleDiagnosis;
    this.exampleDiagnosisErrored = { ...exampleDiagnosis, error: true };
    this.badDiagnosis = { diagnosis: this.exampleDiagnosis.diagnosis };

    this.exampleImaging = exampleImaging;
    this.badImaging = { _id: this.exampleImaging._id };

    this.mq = global.consumerInstance.mq;

    this.channel = this.mq.channel;
    this.diagnosesService = this.mq.diagnosesService;

    this.elef = this.diagnosesService.elef;
  });

  beforeEach(() => {
    this.diagnosesServiceSpy = Sinon.spy(this.diagnosesService, 'postError');

    this.ackStub = Sinon.stub(this.channel, 'ack');
    this.rejectStub = Sinon.stub(this.channel, 'reject');
  });

  afterEach(() => {
    this.diagnosesServiceSpy.restore();

    this.ackStub.restore();
    this.rejectStub.restore();
  });

  describe('Elef', () => {
    beforeEach(() => {
      this.axiosStub = Sinon.stub(Axios, 'post');
    });

    afterEach(() => {
      this.axiosStub.restore();
    });

    describe('#_getError', () => {
      it('should generate error', () => {
        // eslint-disable-next-line max-len
        expect(this.elef._getError(this.exampleImaging, this.exampleDiagnosis.diagnosis)).to.eql(this.exampleDiagnosisErrored);
      });
    });

    describe('#postDiagnosisError', () => {
      it('should post with error message', async () => {
        await this.elef.postDiagnosisError(this.exampleImaging, this.exampleDiagnosis.diagnosis);
        expect(this.axiosStub).to.have.been.calledOnceWithExactly(`${Nconf.get('ELEF_URI')}/diagnoses`, this.exampleDiagnosisErrored);
      });

      it('should fail when error message is not valid', async () => {
        const errorGenerator = Sinon.stub(this.elef, '_getError').callsFake(() => this.badDiagnosis);

        await expect(this.elef.postDiagnosisError(this.exampleImaging, this.exampleDiagnosis.diagnosis)).to.be.rejectedWith(``);
        // eslint-disable-next-line max-len
        expect(errorGenerator).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis.diagnosis);
        // eslint-disable-next-line no-unused-expressions
        expect(this.axiosStub).to.have.not.been.called;

        errorGenerator.restore();
      });

      it('should fail when error generator throws', async () => {
        const errorGenerator = Sinon.stub(this.elef, '_getError').throws();

        await expect(this.elef.postDiagnosisError(this.exampleImaging, this.exampleDiagnosis.diagnosis)).to.be.rejectedWith(``);
        // eslint-disable-next-line max-len
        expect(errorGenerator).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis.diagnosis);
        // eslint-disable-next-line no-unused-expressions
        expect(this.axiosStub).to.have.not.been.called;

        errorGenerator.restore();
      });

      it('should fail when client is unreachable', async () => {
        this.axiosStub.restore();

        const fakeElefUrl = '127.0.0.1:80';
        const originalElefUrl = this.elef.url;
        this.elef.url = `http://${fakeElefUrl}`;

        await expect(this.elef.postDiagnosisError(this.exampleImaging, this.exampleDiagnosis.diagnosis)).to.be.rejectedWith(`connect ECONNREFUSED ${fakeElefUrl}`);
        // eslint-disable-next-line no-unused-expressions
        expect(this.axiosStub).to.have.not.been.called;

        this.elef.url = originalElefUrl;
      });
    });
  });

  describe('Diagnoses Service', () => {
    beforeEach(() => {
      this.elefStub = Sinon.stub(this.elef, 'postDiagnosisError');
    });

    afterEach(() => {
      this.elefStub.restore();
    });

    describe('#postError', () => {
      it('should post diagnosis', async () => {
        await this.diagnosesService.postError(this.exampleImaging, this.exampleDiagnosis);
        // eslint-disable-next-line max-len
        expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis);
      });

      it('should fail when given partial diagnosis', async () => {
        await expect(this.diagnosesService.postError(this.badImaging, this.exampleDiagnosis.diagnosis)).to.be.rejectedWith('"type" is required');
      });

      it('should fail when client is unreachable', async () => {
        this.elefStub.restore();
        const elefSpy = Sinon.spy(this.elef, 'postDiagnosisError');

        const fakeElefUrl = '127.0.0.1:80';
        const originalElefUrl = this.elef.url;
        this.elef.url = `http://${fakeElefUrl}`;

        await expect(this.diagnosesService.postError(this.exampleImaging, this.exampleDiagnosis.diagnosis)).to.be.rejectedWith(`connect ECONNREFUSED ${fakeElefUrl}`);
        // eslint-disable-next-line max-len
        expect(elefSpy).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis.diagnosis);
        this.elef.url = originalElefUrl;
        elefSpy.restore();
      });
    });
  });

  describe('Message Handler', () => {
    beforeEach(() => {
      this.elefStub = Sinon.stub(this.elef, 'postDiagnosisError');
    });

    afterEach(() => {
      this.elefStub.restore();
    });

    it('should ack when given proper message', async () => {
      const msg = getMessage(this.exampleImaging, this.exampleDiagnosis.diagnosis);
      await this.mq._msgHandler(msg);

      // eslint-disable-next-line max-len
      expect(this.diagnosesServiceSpy).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis.diagnosis);
      // eslint-disable-next-line max-len
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis.diagnosis);
      expect(this.ackStub).to.have.been.calledOnceWithExactly(msg);
      // eslint-disable-next-line no-unused-expressions
      expect(this.rejectStub).to.have.not.been.called;
    });

    it('should reject with no requeue when given improper message', async () => {
      const msg = getMessage(this.badImaging, this.exampleDiagnosis.diagnosis);
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
      const msg = getMessage(this.exampleImaging, this.exampleDiagnosis.diagnosis);

      this.elefStub.restore();
      this.elefStub = Sinon.stub(this.elef, 'postDiagnosisError').throws();

      await this.mq._msgHandler(msg);

      // eslint-disable-next-line max-len
      expect(this.diagnosesServiceSpy).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis.diagnosis);
      // eslint-disable-next-line max-len
      expect(this.elefStub).to.have.been.calledOnceWithExactly(this.exampleImaging, this.exampleDiagnosis.diagnosis);
      // eslint-disable-next-line no-unused-expressions
      expect(this.ackStub).to.have.not.been.called;
      expect(this.rejectStub).to.have.been.calledOnceWithExactly(msg, true);
    });
  });
});
