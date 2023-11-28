import { AppConfigService } from '../services/app-config-service';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import logger from './logger';

const namespace = AppConfigService.getInstance().cloudWatchMetricsWorkSpace;
const service = AppConfigService.getInstance().metricServiceName;

/**
 * Metric utility which instantiate a Metrics object from aws-lambda-powertools/metrics.
 */
export const metric: Metrics = new Metrics({ namespace: namespace, serviceName: service });

/**
 * wrapper function that flushes stored metrics and logs a JSON formatted logging line in related lambda's log group with the serialised metric object
 */
export function logAndPublishMetric(
  metricName: string,
  metadata: { key: string; value: string }[] = [],
  value = 1,
  dimensions?: { [key: string]: string },
) {
  for (const data of metadata) {
    metric.addMetadata(data.key, data.value);
  }
  metric.addMetric(metricName, MetricUnits.Count, value);
  if (dimensions) metric.addDimensions(dimensions);
  logger.info('logging metric', { metric: metric.serializeMetrics() });
  metric.publishStoredMetrics();
}
