import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

export async function invokeApiGateWayLambda(testUserId: string, historyValue: any) {
  const client = new LambdaClient({});
  const command = new InvokeCommand({
    FunctionName: 'ais-main-kg-InvokePrivateAPIGatewayFunction',
    Payload: JSON.stringify({ userId: testUserId, queryParameters: `history=${historyValue}` }),
  });
  const { Payload } = await client.send(command);
  const result = Payload ? Buffer.from(Payload).toString() : undefined;
  console.log('result' + result);
  return result;
}
