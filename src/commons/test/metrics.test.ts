import { addMetric } from '../metrics';
import { Metrics } from '@aws-lambda-powertools/metrics';

jest.mock('@aws-lambda-powertools/metrics');
jest.mock('@aws-lambda-powertools/logger');

const mockSerialiseMetrics = Metrics.prototype.serializeMetrics as jest.Mock;
const mockPublishStoredMetrics = Metrics.prototype.publishStoredMetrics as jest.Mock;
const mockAddMetadata = Metrics.prototype.addMetadata as jest.Mock;
const mockAddMetric = Metrics.prototype.addMetric as jest.Mock;
const mockAddDimensions = Metrics.prototype.addDimensions as jest.Mock;
mockSerialiseMetrics.mockReturnValue({ _aws: 'this is the serialised data' });

describe('metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds metric with given metadata and default count', () => {
    addMetric('testMetricName', [
      { key: 'secret', value: 'testSecretId' },
      { key: 'testKey', value: 'testValue' },
    ]);
    expect(mockAddMetadata).toHaveBeenCalledTimes(2);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 1);
    expect(mockPublishStoredMetrics).not.toHaveBeenCalled()
  });

  it('adds metric with no metadata and custom count value', () => {
    addMetric('testMetricName', undefined, 4);
    expect(mockAddMetadata).toHaveBeenCalledTimes(0);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 4);
    expect(mockPublishStoredMetrics).not.toHaveBeenCalled()
  });

  it('adds metric with dimensions', () => {
    addMetric('testMetricName', [], 1, { dimensionKey : 'dimensionValue' });
    expect(mockAddMetadata).toHaveBeenCalledTimes(0);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 1);
    expect(mockAddDimensions).toHaveBeenCalledWith({ dimensionKey : 'dimensionValue' })
    expect(mockPublishStoredMetrics).not.toHaveBeenCalled()
  })
});
