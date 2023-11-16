import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

export async function invokeApiGateWayLambda(testUserId:string, historyValue:any){

    const client = new LambdaClient({});
    const command = new InvokeCommand({
        FunctionName: 'ais-main-InvokePrivateAPIGatewayFunction',
        Payload: JSON.stringify({userId: testUserId, queryParameters: history=historyValue}),
        //LogType: LogType.Tail,
      });
 
  const { Payload } = await client.send(command);
  const result = Payload ? Buffer.from(Payload).toString() : null;
  //const logs = Buffer.from(LogResult, "base64").toString();
  console.log("print result" + result);
  return { result };
};