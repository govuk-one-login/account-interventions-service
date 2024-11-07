export default class EndPoints {
  public static AIS_BASE_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://ysxfdzicei.execute-api.${process.env.AWS_REGION}.amazonaws.com/v1`
      : process.env.CFN_PrivateApiEndpoint;
  public static SQS_QUEUE_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://sqs.${process.env.AWS_REGION}.amazonaws.com/484907510598/${process.env.SAM_STACK_NAME}-TxMAIngressQueue`
      : process.env.CFN_TxMAIngressSqsQueueUrl;
  public static SNS_DELETE_ACCOUNT_TOPIC_ARN =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `arn:aws:sns:${process.env.AWS_REGION}:484907510598:${process.env.SAM_STACK_NAME}-AccountDeletionProcessorSNSTopic`
      : process.env.CFN_AccountDeletionProcessorSNSTopicARN;
  public static SQS_EGRESS_QUEUE_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://sqs.${process.env.AWS_REGION}.amazonaws.com/484907510598/${process.env.SAM_STACK_NAME}-TxMAEgressQueue`
      : process.env.CFN_TxMAEgressSqsQueueUrl;
  public static PATH_AIS = '/ais/';
  public static INVOKE_PRIVATE_API_GATEWAY = `${process.env.SAM_STACK_NAME}-InvokePrivateAPIGatewayFunction`;
  public static TABLE_NAME = 'ais-core-account-status';
}
