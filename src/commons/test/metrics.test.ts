import { Mock } from 'vitest';
import { addMetric } from '../metrics';
import { Metrics } from '@aws-lambda-powertools/metrics';

vi.mock('@aws-lambda-powertools/metrics');
vi.mock('@aws-lambda-powertools/logger');

/* eslint-disable @typescript-eslint/unbound-method */
const mockSerialiseMetrics = Metrics.prototype.serializeMetrics as Mock;
const mockPublishStoredMetrics = Metrics.prototype.publishStoredMetrics as Mock;
const mockAddMetadata = Metrics.prototype.addMetadata as Mock;
const mockAddMetric = Metrics.prototype.addMetric as Mock;
const mockAddDimensions = Metrics.prototype.addDimensions as Mock;
/* eslint-enable @typescript-eslint/unbound-method */
mockSerialiseMetrics.mockReturnValue({ _aws: { CloudWatchMetrics: [{ Metrics: ['some metrics '] }] } });

describe('metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds metric with given metadata and default count', () => {
    addMetric('testMetricName', [
      { key: 'secret', value: 'testSecretId' },
      { key: 'testKey', value: 'testValue' },
    ]);
    expect(mockAddMetadata).toHaveBeenCalledTimes(2);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 1);
    expect(mockPublishStoredMetrics).not.toHaveBeenCalled();
  });

  it('adds metric with no metadata and custom count value', () => {
    addMetric('testMetricName', undefined, 4);
    expect(mockAddMetadata).toHaveBeenCalledTimes(0);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 4);
    expect(mockPublishStoredMetrics).not.toHaveBeenCalled();
  });

  it('adds metric with dimensions', () => {
    addMetric('testMetricName', [], 1, { dimensionKey: 'dimensionValue' });
    expect(mockAddMetadata).toHaveBeenCalledTimes(0);
    expect(mockAddMetric).toHaveBeenCalledTimes(1);
    expect(mockAddMetric).toHaveBeenCalledWith('testMetricName', 'Count', 1);
    expect(mockAddDimensions).toHaveBeenCalledWith({ dimensionKey: 'dimensionValue' });
    expect(mockPublishStoredMetrics).toHaveBeenCalledTimes(2);
  });
});
