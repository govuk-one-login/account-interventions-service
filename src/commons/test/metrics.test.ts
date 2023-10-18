import { logAndPublishMetric } from '../metrics';
import { Metrics } from '@aws-lambda-powertools/metrics';
import logger from '../../commons/logger';

jest.mock('@aws-lambda-powertools/metrics');
jest.mock('@aws-lambda-powertools/logger');

const mockSerialiseMetrics = Metrics.prototype.serializeMetrics as jest.Mock;
const mockPublishStoredMetrics = Metrics.prototype.publishStoredMetrics as jest.Mock;
const mockAddMetadata = Metrics.prototype.addMetadata as jest.Mock;
const mockAddMetric = Metrics.prototype.addMetric as jest.Mock;
mockSerialiseMetrics.mockReturnValue({ _aws: 'this is the serialised data' });

describe('metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('log and publish metric with given metadata and default count', () => {
    logAndPublishMetric('testMetricName', [
      { key: 'secret', value: 'testSecretId' },
      { key: 'testKey', value: 'testValue' },
    ]);
    expect(mockAddMetadata).toHaveBeenCalledTimes(2);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 1);
    expect(logger.info).toHaveBeenCalledWith('logging metric', { metric: { _aws: 'this is the serialised data' } });
    expect(mockPublishStoredMetrics).toHaveBeenCalledTimes(1);
  });

  it('log and publish metric with no metadata and custom count value', () => {
    logAndPublishMetric('testMetricName', undefined, 4);
    expect(mockAddMetadata).toHaveBeenCalledTimes(0);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 4);
    expect(logger.info).toHaveBeenCalledWith('logging metric', { metric: { _aws: 'this is the serialised data' } });
    expect(mockPublishStoredMetrics).toHaveBeenCalledTimes(1);
  });
});
