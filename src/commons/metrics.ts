import { AppConfigService } from '../services/app-config-service';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { EmfOutput } from '@aws-lambda-powertools/metrics/lib/types';

const namespace = AppConfigService.getInstance().cloudWatchMetricsWorkSpace;
const service = AppConfigService.getInstance().metricServiceName;

/**
 * Metric utility which instantiate a Metrics object from aws-lambda-powertools/metrics.
 */
export const metric: Metrics = new Metrics({ namespace: namespace, serviceName: service });

/**
 * wrapper function that flushes stored metrics and logs a JSON formatted logging line in related lambda's log group with the serialised metric object
 */
export function addMetric(
  metricName: string,
  metadata: { key: string; value: string }[] = [],
  value = 1,
  dimensions?: { [key: string]: string },
) {
  for (const data of metadata) {
    metric.addMetadata(data.key, data.value);
  }
  if (dimensions) {
    if (checkIfAnyMetricToPublish()) metric.publishStoredMetrics();
    metric.addDimensions(dimensions);
    metric.addMetric(metricName, MetricUnits.Count, value);
    metric.publishStoredMetrics();
  } else {
    metric.addMetric(metricName, MetricUnits.Count, value);
  }
}

function checkIfAnyMetricToPublish() {
  const emfOutput: EmfOutput = metric.serializeMetrics();
  return emfOutput._aws.CloudWatchMetrics[0] ? emfOutput._aws.CloudWatchMetrics[0].Metrics.length > 0 : false;
}
