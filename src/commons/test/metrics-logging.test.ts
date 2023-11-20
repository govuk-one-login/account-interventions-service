import { logAndPublishMetric } from '../metrics';
import logger from '../../commons/logger';

jest.mock('../../commons/logger');

describe('metrics logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 2, 13)));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should log and publish metric with dimensions', () => {
    logAndPublishMetric('testMetricName', undefined, 1, { eventName: "interventionEventName"});
    expect(logger.info).toHaveBeenCalledWith('logging metric', {
      metric: {
        _aws: {
          Timestamp: 1_678_665_600_000,
          CloudWatchMetrics: [
            {
              Namespace: 'test_namespace',
              Dimensions: [['service', 'eventName']],
              Metrics: [{ Name: 'testMetricName', Unit: 'Count' }],
            },
          ],
        },
        service: 'test',
        testMetricName: 1,
        eventName: 'interventionEventName'
      },
    }); //pragma: allowlist secret
  });

  it('should log and publish metric with given metadata and default count in the expected seriliased format', () => {
    logAndPublishMetric('testMetricName', [
      { key: 'secret', value: 'testSecretId' },
      { key: 'testKey', value: 'testValue' },
    ]);
    expect(logger.info).toHaveBeenCalledWith('logging metric', {
      metric: {
        _aws: {
          Timestamp: 1_678_665_600_000,
          CloudWatchMetrics: [
            {
              Namespace: 'test_namespace',
              Dimensions: [['service']],
              Metrics: [{ Name: 'testMetricName', Unit: 'Count' }],
            },
          ],
        },
        service: 'test',
        testMetricName: 1,
        secret: 'testSecretId',
        testKey: 'testValue',
      },
    }); //pragma: allowlist secret
  });

  it('should log and publish metric with no metadata and custom count valuemin the expected seriliased format', () => {
    logAndPublishMetric('testMetricName', undefined, 4);
    expect(logger.info).toHaveBeenCalledWith('logging metric', {
      metric: {
        _aws: {
          Timestamp: 1_678_665_600_000,
          CloudWatchMetrics: [
            {
              Namespace: 'test_namespace',
              Dimensions: [['service']],
              Metrics: [{ Name: 'testMetricName', Unit: 'Count' }],
            },
          ],
        },
        service: 'test',
        testMetricName: 4,
      },
    }); //pragma: allowlist secret
  });
});
