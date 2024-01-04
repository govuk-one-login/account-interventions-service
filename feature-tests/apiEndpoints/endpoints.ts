export default class EndPoints {
  public static AIS_BASE_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://072ifz6cp9.execute-api.${process.env.AWS_REGION}.amazonaws.com/v1`
      : process.env.CFN_PrivateApiEndpoint;
  public static SQS_QUEUE_URL =
    process.env.TEST_ENVIRONMENT === 'dev'
      ? `https://sqs.${process.env.AWS_REGION}.amazonaws.com/013758878511/${process.env.SAM_STACK_NAME}-TxMAIngressQueue`
      : process.env.CFN_TxMAIngressSqsQueueUrl;
  public static PATH_AIS = '/ais/';
  public static INVOKE_PRIVATE_API_GATEWAY = `${process.env.SAM_STACK_NAME}-InvokePrivateAPIGatewayFunction`;
}
