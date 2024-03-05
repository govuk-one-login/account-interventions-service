import { CloudWatchLogsClient, FilterLogEventsCommand, FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';

export interface LogEvent extends Omit<FilteredLogEvent, 'message'> {
  message: EventMessage | string;
}

interface EventMessage {
  message?: string;
  userId?: string;
}

class CloudWatchLogsService {
  client = new CloudWatchLogsClient({
    region: process.env.AWS_REGION,
  });
  LOG_GROUPS = [
    '/aws/lambda/ais-main-StatusRetrieverFunction',
    '/aws/lambda/ais-main-InterventionsProcessorFunction',
    '/aws/lambda/ais-main-AccountDeletionProcessorFunction',
    '/aws/lambda/ais-main-InvokePrivateAPIGatewayFunction',
  ];
  initialStartTime = Date.now();
  startTime = Date.now(); // - 100000;
  logs: LogEvent[] = [];

  constructor() {}

  setStartTime() {
    this.startTime = Date.now();
  }

  async getTestLogs() {
    await this.getLogs(this.startTime);
  }

  async getAllLogs() {
    await this.getLogs(this.initialStartTime);
  }

  async getLogs(startTime: number) {
    this.logs = [];
    for (const logGroupName of this.LOG_GROUPS) {
      let nextToken: string | undefined;
      do {
        const logs = await this.client.send(
          new FilterLogEventsCommand({
            logGroupName,
            startTime,
            ...(nextToken && { nextToken }),
          }),
        );

        if (logs?.events) {
          for (const log of logs?.events) {
            this.logs.push(this.parseMessage(log));
          }
        }

        nextToken = logs.nextToken;
      } while (nextToken);
    }
  }

  parseMessage(log: FilteredLogEvent): LogEvent {
    let message: EventMessage | string = '';
    if (log.message && typeof log.message === 'string') {
      try {
        message = JSON.parse(log.message) as EventMessage;
      } catch {
        message = log.message;
      }
    }

    return { ...log, message };
  }

  filterMessagesBy(key: string) {
    return this.logs.filter((log) => log.message && log.message.hasOwnProperty(key));
  }
}

export const cloudwatchLogs = new CloudWatchLogsService();
