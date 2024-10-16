import { SQSEvent, Context } from 'aws-lambda';
import logger from '../commons/logger';

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.addContext(context);
  if (!event.Records[0]) {
    logger.error('The event does not contain any records.');
    return;
  }

  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    console.log(body);
  }

  return;
};
