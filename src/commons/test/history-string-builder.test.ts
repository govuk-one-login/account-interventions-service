import { HistoryStringBuilder } from '../history-string-builder';
import { TriggerEventsEnum } from '../../data-types/constants';
import { TicfAccountIntervention } from '../../contracts/intervention-events';

const interventionEventBody: TicfAccountIntervention = {
  timestamp: 1000,
  event_timestamp_ms: 123456,
  user: {
    user_id: 'abc',
  },
  component_id: 'TICF_CRI',
  event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
  event_id: '123',
  extensions: {
    intervention: {
      intervention_code: '01',
      intervention_reason: 'reason',
      requester_id: 'requester_id',
      originating_component_id: 'originating_component_id',
      originator_reference_id: 'intervention_predecessor_id',
    },
  },
};

describe('history-string-builder', () => {
  const stringBuilder = new HistoryStringBuilder();
  it('should return a history string formatted correctly', () => {
    const result = stringBuilder.getHistoryString(interventionEventBody, 123456);
    const expectedResult =
      '123456|TICF_CRI|01|reason|originating_component_id|intervention_predecessor_id|requester_id';
    expect(result).toEqual(expectedResult);
  });
  it('should return a history object with the expected values', () => {
    const result = stringBuilder.getHistoryObject(
      '123456|TICF_CRI|01|reason|originating_component_id|intervention_predecessor_id|requester_id',
    );
    const expectedResult = {
      sentAt: '1970-01-01T00:02:03.456Z',
      component: 'TICF_CRI',
      code: '01',
      intervention: 'FRAUD_SUSPEND_ACCOUNT',
      reason: 'reason',
      originatingComponent: 'originating_component_id',
      originatorReferenceId: 'intervention_predecessor_id',
      requesterId: 'requester_id',
    };
    expect(result).toEqual(expectedResult);
  });
  it("should return a history object with the expected values, even when optional values aren't there", () => {
    const result = stringBuilder.getHistoryObject('123456|TICF_CRI|01|reason|||');
    const expectedResult = {
      sentAt: '1970-01-01T00:02:03.456Z',
      component: 'TICF_CRI',
      code: '01',
      intervention: 'FRAUD_SUSPEND_ACCOUNT',
      reason: 'reason',
    };
    expect(result).toEqual(expectedResult);
  });
  it('should throw if retrieved history string is malformed', () => {
    expect(() => stringBuilder.getHistoryObject('something|somethingElse')).toThrow(
      new Error('History string does not contain the right amount of components.'),
    );
  });

  it('should throw if retrieved history string does not have one of the required components', () => {
    const historyString = '123456||01||originating_component_id|intervention_predecessor_id|requester_i';
    expect(() => stringBuilder.getHistoryObject(historyString)).toThrow(
      new Error('One of the required property was not found in the history string.'),
    );
  });
});
