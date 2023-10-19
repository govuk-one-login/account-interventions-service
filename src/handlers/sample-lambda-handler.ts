import logger from '../commons/logger';
import { AccountStateEvents } from '../services/account-states/account-state-events';
import { AccountStateEventEnum } from '../data-types/constants';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service';

export const handle = async (): Promise<void> => {
  // const userId = 'AIS-test-user-id';
  // const fraudInterventionEvent = {
  //   timestamp: 1234,
  //   event_timestamp_ms: 1234000,
  //   event_name: 'TICF_ACCOUNT_INTERVENTION',
  //   component_id: "TICF_CRI",
  //   user: { user_id: userId },
  //   extension: {
  //     intervention: {
  //       intervention_code: 1,
  //       intervention_reason: "something"
  //     }
  //   }
  // }
  //
  // const userLedActionEventPswReset = {
  //   event_name: "AUTH_PASSWORD_RESET_SUCCESSFUL",
  //   timestamp: 1697629119,
  //   client_id: "UNKNOWN",
  //   component_id: "UNKNOWN",
  //   user: {
  //     "user_id": "urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9NCEp5d4",
  //     "email": "",
  //     "phone": "UNKNOWN",
  //     "ip_address": "",
  //     "session_id": "",
  //     "persistent_session_id": "",
  //     "govuk_signin_journey_id": "",
  //   }
  // }
  //
  // const userLedActionIDReset = {
  //   event_name: "IPV_IDENTITY_ISSUED",
  //   component_id: "https://identity.build.account.gov.uk",
  //   user: {
  //     "user_id": "urn:uuid:689ab047-6b69-4683-a722-1c9feb8a693b",
  //     "session_id": "aZQEd_Iqp57c6xxmsIChKUFYwAborYpL9EQ3yNU11E0",
  //     "govuk_signin_journey_id": "9ef4374f-7c35-4f83-9a8f-389cfa581001",
  //     "ip_address": null
  //   },
  //   extensions: {
  //     "levelOfConfidence": "P2",
  //     "ciFail": false,
  //     "hasMitigations": false
  //   },
  //   timestamp: 1697617747,
  //   event_timestamp_ms: 1697617747484
  // }

  const currentAccumulatorSuspendedState = {
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: false,
  };

  const result = AccountStateEvents.applyEventTransition(
    currentAccumulatorSuspendedState,
    AccountStateEventEnum.FRAUD_BLOCK_ACCOUNT,
  );
  logger.debug(JSON.stringify(result));

  const service = new DynamoDatabaseService('ais-core-ch-account-status');
  const response = await service.putItemForUserId('nweTestUser', result);
  console.log(response);
};
