import { Matchers, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';
import { term } from '@pact-foundation/pact/src/dsl/matchers';
import { boolean, number, string } from '@pact-foundation/pact/src/v3/matchers';
import { validateEventAgainstSchema } from '../../services/validate-event';
import path from 'node:path';
const { like } = Matchers;

describe('TxMA & AIS - Contract Testing - Consumer', () => {
  const messagePact = new MessageConsumerPact({
    consumer: 'AccountInterventionsServiceConsumer',
    dir: path.resolve(process.cwd(), 'pacts'),
    pactfileWriteMode: 'update',
    provider: 'TxMAProvider',
    logLevel: "error",
  });

  describe('Incoming event is received from TxMA', () => {
    it('accepts a valid intervention event from TxMA', () => {
      return messagePact
        .given('AIS is healthy')
        .expectsToReceive('a valid intervention event')
        .withContent({
          timestamp: like(1_705_318_190),
          event_name: 'TICF_ACCOUNT_INTERVENTION',
          user: {
            user_id: string('urn:fdc:gov.uk:2022:USER_ONE'),
          },
          extensions: {
            intervention: {
              intervention_code: term({ generate: '01', matcher: '^(01|02|03|04|05|06|07)$' }),
              intervention_reason: string('a reason for the intervention'),
            },
          },
        })
        .verify(synchronousBodyHandler(syncMessageHandler));
    });
    it('accepts a valid user action (reset password) event from TxMA', () => {
      return messagePact
        .given('AIS is healthy')
        .expectsToReceive('a valid user action event - reset password')
        .withContent({
          timestamp: number(1_705_318_190),
          event_name: like('AUTH_PASSWORD_RESET_SUCCESSFUL'),
          user: {
            user_id: string('urn:fdc:gov.uk:2022:USER_ONE'),
          },
        })
        .verify(synchronousBodyHandler(syncMessageHandler));
    });
    it('accepts a valid user action (reset identity) event from TxMA', () => {
      return messagePact
        .given('AIS is healthy')
        .expectsToReceive('a valid user action event - reset password')
        .withContent({
          timestamp: number(1_705_318_190),
          event_name: like('IPV_IDENTITY_ISSUED'),
          user: {
            user_id: string('urn:fdc:gov.uk:2022:USER_ONE'),
          },
          extensions: {
            levelOfConfidence: like('P2'),
            ciFail: boolean(false),
            hasMitigations: boolean(false),
          },
        })
        .verify(synchronousBodyHandler(syncMessageHandler));
    });
  });
});

function syncMessageHandler(event: any) {
  validateEventAgainstSchema(event);
  return;
}
