import { AISInterventionTypes, TriggerEventsEnum } from '../../data-types/constants';
import { CurrentTimeDescriptor } from '../../data-types/interfaces';
import { InMemoryRecordService } from '../../services/dynamo-db-record-service';
import { accountStatusTableConfig, PersistentAccountStatusService } from '../account-status';

const currentTimestamp: CurrentTimeDescriptor = {
  isoString: '123',
  seconds: 123,
  milliseconds: 1234,
};

describe('PersistentAccountStatusService', () => {
  test('getAccountStateInformation', async () => {
    const accountStatus = {
      pk: '1234',
      sentAt: 1234567890,
      appliedAt: 1234567890,
      isAccountDeleted: false,
      history: [],
      intervention: '',
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    };

    const service = new PersistentAccountStatusService(
      new InMemoryRecordService<typeof accountStatusTableConfig.schema>([accountStatus]),
    );

    const res = await service.getAccountStateInformation('1234');

    expect(res).toEqual(accountStatus);
  });

  test('getFullAccountInformation', async () => {
    const accountStatus = {
      pk: '1234',
      sentAt: 1234567890,
      appliedAt: 1234567890,
      isAccountDeleted: false,
      history: [],
      intervention: '',
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    };

    const service = new PersistentAccountStatusService(
      new InMemoryRecordService<typeof accountStatusTableConfig.schema>([accountStatus]),
    );

    const res = await service.getFullAccountInformation('1234');

    expect(res).toEqual(accountStatus);
  });

  test('updateUserStatus', async () => {
    const accountStatus = {
      pk: '1234',
      sentAt: 1234567890,
      appliedAt: 1234567890,
      isAccountDeleted: false,
      history: [],
      intervention: '',
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    };

    const recordService = new InMemoryRecordService<typeof accountStatusTableConfig.schema>([accountStatus]);

    const recordServiceUpdateSpy = vi.spyOn(recordService, 'update');

    const service = new PersistentAccountStatusService(recordService);

    await service.updateUserStatus(
      '1234',
      {
        stateResult: {
          blocked: false,
          suspended: true,
          resetPassword: false,
          reproveIdentity: false,
        },
        interventionName: AISInterventionTypes.AIS_ACCOUNT_SUSPENDED,
        nextAllowableInterventions: [],
      },
      currentTimestamp,
      {
        component_id: 'TEST',
        timestamp: 1234,
        event_timestamp_ms: 12345,
        user: {
          user_id: '1234556',
        },
        event_name: TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION,
        extensions: {
          intervention: {
            intervention_code: '01',
            intervention_reason: '',
          },
        },
      },
      [],
    );

    expect(recordServiceUpdateSpy).toHaveBeenLastCalledWith('1234', {
      ExpressionAttributeNames: {
        '#AA': 'appliedAt',
        '#B': 'blocked',
        '#H': 'history',
        '#INT': 'intervention',
        '#RI': 'reproveIdentity',
        '#RP': 'resetPassword',
        '#S': 'suspended',
        '#SA': 'sentAt',
        '#UA': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':aa': 1234,
        ':b': false,
        ':h': ['12345|TEST|01||||'],
        ':int': 'AIS_ACCOUNT_SUSPENDED',
        ':ri': false,
        ':rp': false,
        ':s': true,
        ':sa': 12345,
        ':ua': 1234,
      },
      UpdateExpression:
        'SET #B = :b, #S = :s, #RP = :rp, #RI = :ri, #UA = :ua, #INT = :int, #SA = :sa, #AA = :aa, #H = :h',
    });
  });

  test('updateDeleteStatus', async () => {
    const recordService = new InMemoryRecordService<typeof accountStatusTableConfig.schema>([]);

    const recordServiceUpdateSpy = vi.spyOn(recordService, 'update');

    const service = new PersistentAccountStatusService(recordService);

    const res = await service.updateDeleteStatus('1234');

    expect(res).toEqual(undefined);

    expect(recordServiceUpdateSpy).toHaveBeenLastCalledWith('1234', {
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':deletedAt': expect.any(Number) as number,
        ':false': false,
        ':isAccountDeleted': true,
        ':ttl': expect.any(Number) as number,
      },
      ReturnValues: 'ALL_NEW',
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
    });
  });
});
