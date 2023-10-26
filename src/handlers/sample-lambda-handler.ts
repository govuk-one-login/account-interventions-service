import logger from '../commons/logger';
import { AccountStateEvents } from '../services/account-states/account-state-events';
import { EventsEnum } from '../data-types/constants';
import { DynamoDbService as DynamoDatabaseService } from '../services/dynamo-db-service';

export const handle = async (): Promise<void> => {
  // const userId = 'AIS-test-user-id';
  // const fraudInterventionEvent = {
  //   timestamp: 1234,
  //   event_timestamp_ms: 1234000,
  //   event_name: "TICF_ACCOUNT_INTERVENTION",
  //   component_id: "TICF_CRI",
  //   user: { user_id: "AIS-test-user-id" },
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

  const accumulatorSuspendedState = {
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: false,
  };

  const accumulatorNeedsPswReset = {
    blocked: false,
    suspended: true,
    resetPassword: true,
    reproveIdentity: false,
  };

  // const accNeedsIDReset = {
  //   blocked: false,
  //   suspended: true,
  //   resetPassword: false,
  //   reproveIdentity: true,
  // };
  //
  // const accNeedsIDResetAdnPswReset = {
  //   blocked: false,
  //   suspended: true,
  //   resetPassword: true,
  //   reproveIdentity: true,
  // };
  //
  // const accIsBlocked = {
  //   blocked: true,
  //   suspended: false,
  //   resetPassword: false,
  //   reproveIdentity: false,
  // }
  //
  // const accNoIntervention = {
  //   blocked: false,
  //   suspended: false,
  //   resetPassword: false,
  //   reproveIdentity: false,
  // }
  const service = new DynamoDatabaseService('ais-core-ch-account-status');

  console.log('============= Suspend --> Blocked =============');
  const result1 = AccountStateEvents.applyEventTransition(EventsEnum.FRAUD_BLOCK_ACCOUNT, accumulatorSuspendedState);
  logger.debug(JSON.stringify(result1));
  await service.updateUserStatus('test1', result1);

  console.log('=====================================================');

  console.log('============= PswReset --> Unsuspended =============');

  const result2 = AccountStateEvents.applyEventTransition(
    EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL,
    accumulatorNeedsPswReset,
  );
  logger.debug(JSON.stringify(result2));
  await service.updateUserStatus('test2', result2);

  console.log('=====================================================');

  console.log('============= PswReset --> IdReset =============');

  const result3 = AccountStateEvents.applyEventTransition(
    EventsEnum.FRAUD_FORCED_USER_IDENTITY_REVERIFICATION,
    accumulatorNeedsPswReset,
  );
  logger.debug(JSON.stringify(result3));
  await service.updateUserStatus('test3', result3);

  console.log('=====================================================');
};
