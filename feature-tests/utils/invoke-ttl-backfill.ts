import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import EndPoints from '../apiEndpoints/endpoints';
import { BackfillEvent, BackfillReport } from '../../src/handlers/ttl-backfill';

/**
 * Invoke the manually-triggered TTL backfill lambda and return its report.
 *
 * The event and report types are imported from the handler itself so this test is bound to the same
 * input/output contract the lambda enforces, per the boundary-typing strategy in ADR 007.
 * @param event - the backfill instruction (createdAt window, optional limit and resume key)
 * @returns the backfill report the lambda returned
 */
export async function invokeTtlBackfill(event: BackfillEvent): Promise<BackfillReport> {
  const client = new LambdaClient({ region: process.env.AWS_REGION });
  const command = new InvokeCommand({
    FunctionName: EndPoints.TTL_BACKFILL_FUNCTION,
    Payload: JSON.stringify(event),
  });
  const { Payload } = await client.send(command);
  const resultStringFromLambda = Payload ? Buffer.from(Payload).toString() : '';
  return JSON.parse(resultStringFromLambda) as BackfillReport;
}
