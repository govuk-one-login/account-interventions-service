import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import EndPoints from '../apiEndpoints/endpoints';
import request from 'supertest';
import { CustomEvent } from '../../src/handlers/invoke-private-api';

export async function invokeGetAccountState(testUserId: string, historyValue: boolean, v2Endpoint: boolean = false) {
  if (process.platform === 'darwin' || process.env['USE_PRIVATE_API_GATEWAY']) {
    const client = new LambdaClient({});

    const payload: CustomEvent = {
      userId: testUserId,
      queryParameters: `history=${historyValue}`,
      ...(v2Endpoint && {
        privateApi: true,
        endpoint: '/v2/ais',
      }),
    };

    const command = new InvokeCommand({
      FunctionName: EndPoints.INVOKE_PRIVATE_API_GATEWAY,
      Payload: JSON.stringify(payload),
    });
    const { Payload } = await client.send(command);
    const resultStringFromLambda = Payload ? Buffer.from(Payload).toString() : '';
    const resultObjectFromLambda = JSON.parse(resultStringFromLambda);
    return JSON.parse(resultObjectFromLambda.body);
  } else if (process.platform === 'linux') {
    const url = v2Endpoint ? EndPoints.AIS_MAIN_URL! : EndPoints.AIS_BASE_URL!;
    const basePath = v2Endpoint ? '/v2/ais/' : /ais/;

    const resultFromAPI = await request(url)
      .get(basePath + testUserId)
      .query({ history: historyValue })
      .set('Content-Type', 'application/json')
      .set('Accept', '*/*');
    return JSON.parse(resultFromAPI.text);
  }
}
