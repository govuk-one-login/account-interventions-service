import { MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';
import { COMPONENT_ID } from '../../data-types/constants';
import { string } from '@pact-foundation/pact/src/v3/matchers';
import pkg from "@pact-foundation/pact-node";
const { publishPacts } = pkg;

import path from 'node:path';

describe('AMF & AIS - Contract Testing - Consumer', () => {
  const messagePact = new MessageConsumerPact({
    consumer: COMPONENT_ID,
    dir: path.resolve(process.cwd(), 'pacts'),
    pactfileWriteMode: 'update',
    provider: 'Account Management Frontend',
    logLevel: "info",
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

const publishPact = async () => {
  console.log("STARTING PUBLISH PACT");
  try {
    const publishOptions = {
      pactFilesOrDirs: [path.resolve(process.cwd(), "pacts")],
      pactBroker: process.env['PACT_BROKER_URL']!,
      pactBrokerUsername: process.env['PACT_BROKER_USER']!,
      pactBrokerPassword: process.env['PACT_BROKER_PASSWORD']!,
      logLevel: "info",
      consumerVersion: process.env['CONSUMER_APP_VERSION']!,
      branch: "main"
    };

    await publishPacts(publishOptions);
  } catch (err) {
    console.error("UNABLE TO PUBLISH PACTS ", err);
    process.exitCode = 1;
  }
};

void publishPact();
