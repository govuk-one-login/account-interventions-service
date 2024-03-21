import { defineFeature, loadFeature } from 'jest-cucumber';
import { generateRandomTestUserId } from '../../../utils/generate-random-test-user-id';
import {
  sendInvalidSQSEvent,
  sendSQSEvent,
  filterUserIdInMessages,
  purgeEgressQueue,
} from '../../../utils/send-sqs-message';
import { invokeGetAccountState } from '../../../utils/invoke-apigateway-lambda';
import { attemptParseJSON, timeDelayForTestEnvironment } from '../../../utils/utility';
import { sendSNSDeleteMessage } from '../../../utils/send-sns-message';

const feature = loadFeature('./tests/resources/features/aisGET/InvokeApiGateWay-UnHappyPath-EgressQueue.feature');

defineFeature(feature, (test) => {
  let testUserId: string;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let response: any;

  beforeAll(async () => {
    await purgeEgressQueue();
  });

  beforeEach(() => {
    testUserId = generateRandomTestUserId();
  });

  test('UnHappy Path - Check Egress Queue Error messages for future time stamp - Returns Expected data for <invalidAisEventType>', ({
    given,
    when,
    then,
  }) => {
    given(
      /^I send an invalid (.*) intervention with future time stamp event message to the TxMA ingress SQS queue$/,
      async (eventType) => {
        await sendInvalidSQSEvent(testUserId, eventType);
      },
    );

    when(/^I invoke an API to retrieve the intervention status of the account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
    });

    then(/^I expect Egress Queue response with (.*)$/, async (eventName) => {
      const receivedMessage = await filterUserIdInMessages(testUserId);
      const body = receivedMessage[0].Body;
      const event_name = body ? attemptParseJSON(body).event_name : {};
      expect(event_name).toEqual(eventName);
    });
  });

  test('UnHappy Path - Check Egress Queue Error messages for Ignored event - Returns Expected data for <invalidAisEventType>', ({
    given,
    when,
    and,
    then,
  }) => {
    given(/^I send an valid (.*) intervention event message to the TxMA ingress SQS queue$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(/^I invoke an API to retrieve the intervention status of the account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
      console.log('Response', { response });
    });

    and(
      /^I send an other (.*) intervention with past time stamp to the TxMA ingress SQS queue$/,
      async (secondAisEventType) => {
        await timeDelayForTestEnvironment(1500);
        await sendInvalidSQSEvent(testUserId, secondAisEventType);
      },
    );

    then(/^I expect the Egress Queue response with (.*)$/, async (eventName) => {
      const receivedMessage = await filterUserIdInMessages(testUserId);
      const message = receivedMessage.find((object) => {
        const objectBody = object.Body ? attemptParseJSON(object.Body) : {};
        return objectBody.extensions?.description === 'AIS_NO_INTERVENTION';
      });
      const body = message?.Body ? attemptParseJSON(message?.Body) : {};
      expect(body.event_name).toEqual(eventName);
    });
  });

  test('UnHappy Path - Check Egress Queue Error messages for Deleted User - Returns Expected data for <invalidAisEventType>', ({
    given,
    when,
    and,
    then,
  }) => {
    given(/^I send an valid (.*) intervention event to the TxMA ingress SQS queue$/, async (aisEventType) => {
      await sendSQSEvent(testUserId, aisEventType);
    });

    when(/^I send a message with userId to the Delete SNS Topic$/, async () => {
      await timeDelayForTestEnvironment(1500);
      const messageKey = 'user_id';
      response = await sendSNSDeleteMessage(messageKey, testUserId);
    });

    and(/^I invoke an API to retrieve the deleted intervention status of the user account$/, async () => {
      await timeDelayForTestEnvironment(1500);
      response = await invokeGetAccountState(testUserId, true);
    });

    and(
      /^I send an valid (.*) intervention event to the TxMA ingress SQS queue for the deleted user$/,
      async (aisEventType) => {
        await sendSQSEvent(testUserId, aisEventType);
      },
    );

    then(
      /^I expect response with valid deleted marker fields (.*) for the userId in the Egrees Queue$/,
      async (eventName) => {
        const receivedMessage = await filterUserIdInMessages(testUserId);
        const message = receivedMessage.find((object) => {
          const objectBody = object.Body ? attemptParseJSON(object.Body) : {};
          return objectBody.extensions?.description === 'AIS_NO_INTERVENTION';
        });
        const body = message?.Body ? attemptParseJSON(message?.Body) : {};
        expect(body.event_name).toEqual(eventName);
      },
    );
  });
});
