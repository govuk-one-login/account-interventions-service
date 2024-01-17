import { MessageConsumerPact, synchronousBodyHandler, LogLevel } from '@pact-foundation/pact';
import { COMPONENT_ID } from '../data-types/constants';
import { string } from '@pact-foundation/pact/src/v3/matchers';

const path = require('node:path');
const LOG_LEVEL = process.env['LOG_LEVEL'] || 'ERROR';

describe('AMF & AIS - Contract Testing - Consumer', () => {
  const messagePact = new MessageConsumerPact({
    consumer: COMPONENT_ID,
    dir: path.resolve(process.cwd(), 'pacts'),
    pactfileWriteMode: 'update',
    provider: 'Account Management Frontend',
    logLevel: LOG_LEVEL as LogLevel,
  });

  describe('Incoming delete account event from Account Management Frontend', () => {
    it('accepts a valid account deletion event', () => {
      return messagePact
        .given('AIS is healthy')
        .expectsToReceive('a valid intervention event')
        .withContent({
          user_id: string('urn:fdc:gov.uk:2022:USER_ONE'),
        })
        .verify(synchronousBodyHandler(syncMessageHandler));
    });
  });
});

function syncMessageHandler(event: any) {
  const userId = event['user_id'];
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid Message');
  }
  return;
}
