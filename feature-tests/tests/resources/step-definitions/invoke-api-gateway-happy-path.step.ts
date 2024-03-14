import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import { sendSQSEvent, purgeEgressQueue, filterUserIdInMessages } from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import {
  InformationFromTable,
  attemptParseJSON,
  timeDelayForTestEnvironment,
  getPastTimestamp,
} from '../../../utils/utility';
import { aisEventResponse } from '../../../utils/ais-events-responses';
import { updateItemInTable } from '../../../utils/dynamo-database-methods';
import { cloudwatchLogs, LogEvent } from '../../../utils/cloudwatch-logs-service';
import { sendSNSDeleteMessage } from '../../../utils/send-sns-message';

const feature = loadFeature('./tests/resources/features/aisGET/InvokeApiGateWay-HappyPath.feature');

defineFeature(feature, (test) => {
  let testUserId: string;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: any;
  let events: LogEvent[];

  beforeAll(async () => {
    await purgeEgressQueue();
  });

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
  });

  test('Happy Path - Get Request to /ais/userId - Returns Expected allowable intervention codes from Egress Queue <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send an (.*) intervention to the TxMA ingress SQS queue$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(
      /^I invoke an API to retrieve the intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(1500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the response with next allowable intervention types in TXMA Egress Queue for (.*)$/,
      async (aisEventType: keyof typeof aisEventResponse) => {
        const events = ['userActionIdResetSuccess', 'userActionPswResetSuccess'];
        if (!events.includes(aisEventType)) {
          const receivedMessage = await filterUserIdInMessages(testUserId);
          const body = receivedMessage[0].Body;
          const extensions = body ? attemptParseJSON(body).extensions : {};
          expect(extensions.allowable_interventions).toEqual(aisEventResponse[aisEventType].allowable_interventions);
        }
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(/^I send an (.*) intervention message to the TxMA ingress SQS queue$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(
      /^I invoke the API to retrieve the intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(1500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the response with all the valid state flags for (.*)$/,
      async (aisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received`, { response });
        const eventTypes = ['unSuspendAction', 'unblock'];
        if (eventTypes.includes(aisEventType)) {
          expect(response.intervention.description).toBe('AIS_NO_INTERVENTION');
        } else {
          expect(response.intervention.description).toBe(aisEventResponse[aisEventType].description);
        }
        expect(response.state.blocked).toBe(aisEventResponse[aisEventType].blocked);
        expect(response.state.suspended).toBe(aisEventResponse[aisEventType].suspended);
        expect(response.state.resetPassword).toBe(aisEventResponse[aisEventType].resetPassword);
        expect(response.state.reproveIdentity).toBe(aisEventResponse[aisEventType].reproveIdentity);
        expect(response.auditLevel).toBe(aisEventResponse[aisEventType].auditLevel);
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - allowable Transition from <originalAisEventType> to <allowableAisEventType> - Return expected data', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) allowable intervention event message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (allowableAisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + allowableAisEventType);
        await sendSQSEvent(testUserId, allowableAisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the allowable intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the response with all the valid state fields for the (.*)$/,
      async (allowableAisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(aisEventResponse[allowableAisEventType].description);
        expect(response.state.blocked).toBe(aisEventResponse[allowableAisEventType].blocked);
        expect(response.state.suspended).toBe(aisEventResponse[allowableAisEventType].suspended);
        expect(response.state.resetPassword).toBe(aisEventResponse[allowableAisEventType].resetPassword);
        expect(response.state.reproveIdentity).toBe(aisEventResponse[allowableAisEventType].reproveIdentity);
        expect(response.auditLevel).toBe(aisEventResponse[allowableAisEventType].auditLevel);
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - non-allowable Transition from <originalAisEventType> to <nonAllowableAisEventType> - Returns expected data', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) non-allowable intervention event message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (nonAllowableAisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + nonAllowableAisEventType);
        await sendSQSEvent(testUserId, nonAllowableAisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the non-allowable intervention status of the user's account. With history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the response with all the state fields for the (.*)$/,
      async (originalAisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(aisEventResponse[originalAisEventType].description);
        expect(response.state.blocked).toBe(aisEventResponse[originalAisEventType].blocked);
        expect(response.state.suspended).toBe(aisEventResponse[originalAisEventType].suspended);
        expect(response.state.resetPassword).toBe(aisEventResponse[originalAisEventType].resetPassword);
        expect(response.state.reproveIdentity).toBe(aisEventResponse[originalAisEventType].reproveIdentity);
        expect(response.auditLevel).toBe(aisEventResponse[originalAisEventType].auditLevel);
      },
    );
  });

  test('Get Request to /ais/userId - Password and Id allowable Transition from <originalAisEventType> to <allowableAisEventType> - Returns expected data', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an (.*) allowable event type password or id Reset intervention message to the TxMA ingress SQS queue for a Account in (.*) state$/,
      async (allowableAisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + allowableAisEventType);
        await sendSQSEvent(testUserId, allowableAisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the intervention status of the user's account with history (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect response with valid fields for (.*) with state flags as (.*), (.*), (.*) and (.*)$/,
      async (
        interventionType: string,
        blocked: string,
        suspended: string,
        resetPassword: string,
        reproveIdentity: string,
      ) => {
        console.log(`Received`, { response });
        expect(response.intervention.description).toBe(interventionType);
        expect(response.state.blocked).toBe(JSON.parse(blocked));
        expect(response.state.suspended).toBe(JSON.parse(suspended));
        expect(response.state.resetPassword).toBe(JSON.parse(resetPassword));
        expect(response.state.reproveIdentity).toBe(JSON.parse(reproveIdentity));
        expect(response.auditLevel).toBe('standard');
      },
    );
  });

  test('Get Request to /ais/userId - Password and Id allowable Transition from <originalAisEventType> to <allowableAisEventType> - Returns expected values in the response', ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      /^I send an (.*) allowable event type password or id Reset intervention message for an Account in (.*) state$/,
      async function (allowableAisEventType, originalAisEventType) {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : ' + allowableAisEventType);
        await sendSQSEvent(testUserId, allowableAisEventType);
      },
    );

    when(/^I invoke API to retrieve the intervention status of the user's account$/, async () => {
      response = await invokeGetAccountState(testUserId, false);
    });

    then(/^I expect the response (.*) with the correct time stamp when the event was applied$/, async (values) => {
      console.log(`Received`, { response });
      if (values === 'resetPasswordAt') {
        expect(response.intervention.resetPasswordAt).toBeTruthy();
      } else {
        expect(response.intervention.reprovedIdentityAt).toBeTruthy();
      }
    });

    and(/^I send a new intervention event type (.*)$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
      await timeDelayForTestEnvironment(500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(/^I expect the (.*) is no longer present in the response$/, async (values) => {
      console.log('second response', response);
      if (values === 'resetPasswordAt') {
        expect(response.intervention.resetPasswordAt).toBeFalsy();
      } else {
        expect(response.intervention.reprovedIdentityAt).toBeFalsy();
      }
    });
  });

  test('Happy Path - Get Request to /ais/userId - allowable Transition from <originalAisEventType> to <allowableAisEventType> - Get Request to /ais/userId - Returns expected data with history values', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an updated request to the SQS queue with intervention data of the type (.*) from (.*)$/,
      async (allowableAisEventType, originalAisEventType) => {
        console.log('sending first message to put the user in : ' + originalAisEventType);
        await sendSQSEvent(testUserId, originalAisEventType);
        await timeDelayForTestEnvironment(1500);
        console.log('sending second message to put the user in : ' + allowableAisEventType);
        await sendSQSEvent(testUserId, allowableAisEventType);
      },
    );

    when(
      /^I invoke the API to retrieve the allowable intervention status of the user's account with (.*)$/,
      async (historyValue) => {
        await timeDelayForTestEnvironment(500);
        response = await invokeGetAccountState(testUserId, historyValue);
      },
    );

    then(
      /^I expect the response with history values for the (.*)$/,
      async (allowableAisEventType: keyof typeof aisEventResponse) => {
        console.log(`Received History`, response.history);
        expect(response.intervention.description).toBe(aisEventResponse[allowableAisEventType].description);
        expect(response.history.at(-1).component).toBe(aisEventResponse[allowableAisEventType].componentHistory);
        expect(response.history.at(-1).code).toBe(aisEventResponse[allowableAisEventType].interventionCodeHistory);
        expect(response.history.at(-1).intervention).toBe(aisEventResponse[allowableAisEventType].interventionHistory);
        expect(response.history.at(-1).reason).toBe(aisEventResponse[allowableAisEventType].reason);
        expect(response.auditLevel).toBe(aisEventResponse[allowableAisEventType].auditLevel);
      },
    );
  });

  test('Happy Path - Get Request to /ais/userId - Multiple Transitions from one event type to other event types', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send a multiple requests to sqs queue to transit from one event type to other event types with single userId$/,
      async function () {
        console.log('sending first message to put the user in : passwordResetRequired');
        await sendSQSEvent(testUserId, `pswResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending second message to put the user in : suspendNoAction');
        await sendSQSEvent(testUserId, `suspendNoAction`);

        await timeDelayForTestEnvironment(500);
        console.log('sending third message to put the user in : idResetRequired');
        await sendSQSEvent(testUserId, `idResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fourth message to put the user in : pswAndIdResetRequired');
        await sendSQSEvent(testUserId, `pswAndIdResetRequired`);

        await timeDelayForTestEnvironment(500);
        console.log('sending fifth message to put the user in : block');
        await sendSQSEvent(testUserId, `block`);

        await timeDelayForTestEnvironment(500);
        console.log('sending sixth message to put the user in : unblock');
        await sendSQSEvent(testUserId, `unblock`);
      },
    );

    when(/^I invoke apiGateway to retreive the status of the valid userId with history as true$/, async () => {
      await timeDelayForTestEnvironment(500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(/^I should receive every transition event history data in the response for the ais endpoint$/, async () => {
      expect(response.auditLevel).toBe('standard');
      console.log(`Received History`, response.history);
      expect(response.history.length === 6);
      expect(response.intervention.description).toBe(`AIS_ACCOUNT_UNBLOCKED`);
      expect(response.history.at(0).intervention).toBe(`FRAUD_FORCED_USER_PASSWORD_RESET`);
      expect(response.history.at(1).intervention).toBe(`FRAUD_SUSPEND_ACCOUNT`);
      expect(response.history.at(2).intervention).toBe(`FRAUD_FORCED_USER_IDENTITY_REVERIFICATION`);
      expect(response.history.at(3).intervention).toBe(`FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION`);
      expect(response.history.at(4).intervention).toBe(`FRAUD_BLOCK_ACCOUNT`);
      expect(response.history.at(5).intervention).toBe(`FRAUD_UNBLOCK_ACCOUNT`);
      expect(response.history.at(-1).intervention).toBe(`FRAUD_UNBLOCK_ACCOUNT`);
      expect(response.auditLevel).toBe('standard');
    });
  });

  test('Happy Path - validate history does not contain entries older than 2 years - Returns Expected Data for <aisEventType>', ({
    given,
    when,
    then,
    and,
  }) => {
    given(/^I send an (.*) to a TXMA Ingress queue$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(/^I invoke the API to retrieve the intervention status of the user's account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(/^I expect the response with (.*)$/, async (aisEventInterventionType) => {
      expect(response.intervention.description).toBe(aisEventInterventionType);
      expect(response.history.length === 0);
    });

    when(/^I update the current transition history time stamp to past in db$/, async () => {
      const pastTimeStamp = getPastTimestamp().milliseconds;
      const separator = `|`;
      const stringifiedHistory = `${pastTimeStamp}${separator}${response.history[0].component}${separator}${response.history[0].code}${separator}${response.history[0].reason}${separator}${response.history[0].originatingComponent}${separator}${response.history[0].originatorReferenceId}${separator}${response.history[0].requesterId}`;
      const updateHistoryTimeStampInTable: InformationFromTable = {
        updatedAt: response.intervention.updatedAt,
        sentAt: response.intervention.sentAt,
        appliedAt: response.intervention.appliedAt,
        intervention: response.intervention.description,
        suspended: response.state.suspended,
        reproveIdentity: response.state.reproveIdentity,
        resetPassword: response.state.resetPassword,
        blocked: response.state.blocked,
        history: stringifiedHistory,
      };
      await timeDelayForTestEnvironment(500);
      await updateItemInTable(testUserId, updateHistoryTimeStampInTable);
    });

    and(/^I send an another (.*) event and then invoke the API$/, async (allowableEventType) => {
      await sendSQSEvent(testUserId, allowableEventType);
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(
      /^I expect response with (.*) and only the latest transition history$/,
      async (allowableEventInterventionType) => {
        expect(response.intervention.description).toBe(allowableEventInterventionType);
        expect(response.history.length === 0);
      },
    );
  });

  test('Happy Path - Logs Validation', ({ given, when, then }) => {
    given('Cloudwatch logs have been created', async () => {
      await cloudwatchLogs.getAllLogs();
    });

    when('log events messages contain a userId', () => {
      events = cloudwatchLogs.filterMessagesBy('userId');
    });

    then('the log events should also contain the message prefix sensitive info', () => {
      const sensitiveInfoEvents = events.filter(
        (event) =>
          event.message && typeof event.message !== 'string' && event.message.message?.startsWith('Sensitive info'),
      );
      expect(events.length).toEqual(sensitiveInfoEvents.length);
    });
  });

  test('Happy Path - Send Delete Request to SNS Topic - Flag Record as deleted for userId with AIS Event Type <aisEventType>', ({
    given,
    when,
    then,
    and,
  }) => {
    given(/^I send an (.*) intervention to the TxMA ingress SQS queue which will be deleted$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
      await timeDelayForTestEnvironment(2500);
    });

    when(/^I send a message with the userId to the Delete SNS Topic$/, async () => {
      await timeDelayForTestEnvironment(1500);
      const messageKey = 'user_id';
      response = await sendSNSDeleteMessage(messageKey, testUserId);
      console.log(`AIS Record Deleted via SNS Message Sent`);
    });

    and(/^I invoke an API to retrieve the deleted intervention status of the user's account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(
      /^I expect response with valid deleted marker fields for (.*) with state flags as (.*)$/,
      async (interventionType: string, values) => {
        console.log(`Received`, { response });
        if (values === 'resetPasswordAt') {
          expect(response.intervention.description).toBe(interventionType);
          expect(response.state.accountDeletedAt).toBeTruthy();
          expect(response.auditLevel).toBe('standard');
        }
      },
    );
  });
});
