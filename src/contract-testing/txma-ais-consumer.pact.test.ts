import {
  Matchers,
  MessageConsumerPact,
  synchronousBodyHandler,
  LogLevel,
} from '@pact-foundation/pact';
import {COMPONENT_ID} from "../data-types/constants";
import {validateEventAgainstSchema} from "../services/validate-event";
import {term} from "@pact-foundation/pact/src/dsl/matchers";
import {boolean, number, string} from "@pact-foundation/pact/src/v3/matchers";
const { like } = Matchers;

const path = require('path');
const LOG_LEVEL = process.env['LOG_LEVEL'] || 'DEBUG';

describe('TxMA & AIS - PACT Testing - Consumer', () => {
  const messagePact = new MessageConsumerPact({
    consumer: COMPONENT_ID,
    dir: path.resolve(process.cwd(), 'pacts'),
    pactfileWriteMode: 'update',
    provider: 'TxMA',
    logLevel: LOG_LEVEL as LogLevel,
  });

  describe('Incoming event is received from TxMA', () => {
    it('accepts a valid intervention event from TxMA', () => {
      return (
        messagePact
          .given('AIS is healthy')
          .expectsToReceive('a valid intervention event')
          .withContent({
            timestamp: like(1705318190),
            event_name: 'TICF_ACCOUNT_INTERVENTION',
            //event_id: like(12345),
            //component_id: 'TICF_CRI',
            user: {
              user_id: like('urn:fdc:gov.uk:2022:USER_ONE')
            },
            extensions: {
              intervention : {
                intervention_code: term({ generate: '01', matcher: '^(01|02|03|04|05|06|07)$'}),
                intervention_reason: string('a reason for the intervention'),
                // originating_component_id: string('CMS'),
                // originator_reference_id: string('123456789'),
                // requester_id: string('987654321')
              }
            }
          })
          .verify(synchronousBodyHandler(syncMessageHandler))
      )
    });
    it('accepts a valid user action (reset password) event from TxMA', () => {
      return (
        messagePact
          .given('AIS is healthy')
          .expectsToReceive('a valid user action event - reset password')
          .withContent({
            timestamp: number(1705318190),
            event_name: like('AUTH_PASSWORD_RESET_SUCCESSFUL'),
            //event_id: string('12345'),
            //component_id: like('TICF_CRI'),
            user: {
              user_id: string('urn:fdc:gov.uk:2022:USER_ONE')
            }
          })
          .verify(synchronousBodyHandler(syncMessageHandler))
      )
    });
    it('accepts a valid user action (reset identity) event from TxMA', () => {
      return (
        messagePact
          .given('AIS is healthy')
          .expectsToReceive('a valid user action event - reset password')
          .withContent({
            timestamp: number(1705318190),
            event_name: like('IPV_IDENTITY_ISSUED'),
            //event_id: string('12345'),
            //component_id: like('TICF_CRI'),
            user: {
              user_id: string('urn:fdc:gov.uk:2022:USER_ONE')
            },
            extensions: {
              levelOfConfidence: like('P2'),
              ciFail: boolean(false),
              hasMitigations: boolean(false)
            }
          })
          .verify(synchronousBodyHandler(syncMessageHandler))
      )
    });

  });
});


function syncMessageHandler(event: any){
  validateEventAgainstSchema(event);
  return;
}
