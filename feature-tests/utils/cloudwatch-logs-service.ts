import {
  CloudWatchLogsClient,
  // DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  FilteredLogEvent
} from '@aws-sdk/client-cloudwatch-logs';

interface logEvent extends Omit<FilteredLogEvent, 'message'> {
  message: EventMessage
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
    '/aws/lambda/ais-main-StatusRetrieverFunction'
  ]
  startTime = new Date().valueOf();
  logs:(FilteredLogEvent | logEvent)[] = [];

  constructor() {}

  async getLogs() {
    this.LOG_GROUPS.forEach(async (logGroupName) => {
      const logs = await this.client.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime: this.startTime,
        }),
      );
      // TODO: handle nextToken
      // TODO: handle missing events from logs
      logs.events?.forEach((log) => this.logs.push(log) )
      // return logs.events ?? [];
    })
    this.parseMessages();
    console.log({ logs: this.logs });
  }

  parseMessages() {
    this.logs = this.logs.map((log) => {
        if (log.message && typeof log.message === 'string') {
          try {
            log.message = JSON.parse(log.message) as EventMessage;
          } catch {
            log.message = log.message;
          }
        }
        return log;
    })
  }
}

const cloudwatchLogs = new CloudWatchLogsService();

export default cloudwatchLogs;

// const filterCloudWatchLogs = async (startTime: number) => {
//   // const startTime = new Date().valueOf() - 5000 * 60

//   //   const logDescription = await cloudWatchLogsClient.send(
//   //     new DescribeLogStreamsCommand({
//   //         logGroupName: '/aws/lambda/ais-main-StatusRetrieverFunction',
//   //         // orderBy: 'LastEventTime',
//   //         descending: true,
//   //         limit: 15
//   //     })
//   //   )

//   //   console.log({ logDescription });
//   //   console.log({ exampleStream: logDescription.logStreams ? logDescription.logStreams[0] : [] })

//   //   const logStreamNames = logDescription.logStreams
//   //     ? logDescription.logStreams.map((stream) => stream.logStreamName ) as string[]
//   //     : undefined

//   const logs = await cloudWatchLogsClient.send(
//     new FilterLogEventsCommand({
//       logGroupName: '/aws/lambda/ais-main-StatusRetrieverFunction',
//       // logStreamNames,
//       startTime,
//       // endTime: 0
//     }),
//   );

//   console.log({ events: logs.events });
//   // TODO: handle nextToken
//   // TODO: handle missing events from logs

//   // console.log(`Number of events missing sensitive info: ${eventsMissingSensitiveInfo?.length}`)

//   return logs.events ?? [];
// };
