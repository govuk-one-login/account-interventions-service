import {
  CloudWatchLogsClient,
  // DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  // FilteredLogEvent
} from '@aws-sdk/client-cloudwatch-logs';

export const cloudWatchLogsClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION,
});

export const filterCloudWatchLogs = async (startTime: number) => {
  // const startTime = new Date().valueOf() - 5000 * 60

  //   const logDescription = await cloudWatchLogsClient.send(
  //     new DescribeLogStreamsCommand({
  //         logGroupName: '/aws/lambda/ais-main-StatusRetrieverFunction',
  //         // orderBy: 'LastEventTime',
  //         descending: true,
  //         limit: 15
  //     })
  //   )

  //   console.log({ logDescription });
  //   console.log({ exampleStream: logDescription.logStreams ? logDescription.logStreams[0] : [] })

  //   const logStreamNames = logDescription.logStreams
  //     ? logDescription.logStreams.map((stream) => stream.logStreamName ) as string[]
  //     : undefined

  const logs = await cloudWatchLogsClient.send(
    new FilterLogEventsCommand({
      logGroupName: '/aws/lambda/ais-main-StatusRetrieverFunction',
      // logStreamNames,
      startTime,
      // endTime: 0
    }),
  );

  console.log({ events: logs.events });
  // TODO: handle nextToken
  // TODO: handle missing events from logs

  // console.log(`Number of events missing sensitive info: ${eventsMissingSensitiveInfo?.length}`)

  return logs.events ?? [];
};
