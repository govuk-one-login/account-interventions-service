export default class EndPoints {
  public static SQS_QUEUE_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://sqs.${process.env.AWS_REGION}.amazonaws.com/484907510598/${process.env.SAM_STACK_NAME}-TxMAIngressQueue`
      : process.env.CFN_TxMAIngressSqsQueueUrl;
}
