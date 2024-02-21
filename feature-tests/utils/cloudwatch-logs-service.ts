import {
  CloudWatchLogsClient,
  // DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  FilteredLogEvent,
} from '@aws-sdk/client-cloudwatch-logs';

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
  startTime = Date.now(); // - 100000;
  logs: LogEvent[] = [];

  constructor() {}

  async getLogs() {
    for (const logGroupName of this.LOG_GROUPS) {
      console.log({ logGroupName, startTime: this.startTime });

      let logs = await this.client.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime: this.startTime,
        }),
      );
      console.log('logs filter');
      console.log({ logsInService: logs });

      if (logs?.events) {
        for (const log of logs?.events) {
          this.logs.push(this.parseMessage(log));
        }
      }

      while (logs.nextToken) {
        logs = await this.client.send(
          new FilterLogEventsCommand({
            logGroupName,
            startTime: this.startTime,
            nextToken: logs.nextToken,
          }),
        );
        console.log({ logsInServiceNextToken: logs });

        if (logs?.events) {
          for (const log of logs?.events) {
            this.logs.push(this.parseMessage(log));
          }
        }
      }
      // TODO: handle missing events from logs
      // return logs.events ?? [];
    }
    // this.parseMessages();
  }

  parseMessage(log: FilteredLogEvent): LogEvent {
    // logs = logs.map((log) => {
    let message: EventMessage | string = '';
    if (log.message && typeof log.message === 'string') {
      try {
        message = JSON.parse(log.message) as EventMessage;
      } catch {
        message = log.message;
      }
    }

    return { ...log, message };
    // })
    // console.log({ logs: this.logs });
  }

  filterLogsBy(parameter: string) {
    return this.logs.filter((log) => log.message && log.message.hasOwnProperty(parameter));
  }
}

export const cloudwatchLogs = new CloudWatchLogsService();
