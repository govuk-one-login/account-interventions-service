import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import EndPoints from '../apiEndpoints/endpoints';
import request from 'supertest';

export async function invokeGetAccountState(testUserId: string, historyValue: boolean) {
  if (process.platform === 'darwin') {
    const client = new LambdaClient({});
    const command = new InvokeCommand({
      FunctionName: 'ais-main-InvokePrivateAPIGatewayFunction',
      Payload: JSON.stringify({ userId: testUserId, queryParameters: `history=${historyValue}` }),
    });
    const { Payload } = await client.send(command);
    const resultStringFromLambda = Payload ? Buffer.from(Payload).toString() : '';
    const resultObjectFromLambda = JSON.parse(resultStringFromLambda);
    return JSON.parse(resultObjectFromLambda.body);
  } else if (process.platform === 'linux') {
    const resultFromAPI = await request(EndPoints.AIS_BASE_URL)
      .get(EndPoints.PATH_AIS + testUserId)
      .query({ history: historyValue })
      .set('Content-Type', 'application/json')
      .set('Accept', '*/*');
    return JSON.parse(resultFromAPI.text);
  }
}
