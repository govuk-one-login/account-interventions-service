import { mockClient } from 'aws-sdk-client-mock';
import { AISInterventionTypes, TriggerEventsEnum } from '../../data-types/constants';
import { DynamoDBRecordService, InMemoryRecordService } from '../../services/dynamo-db-record-service';
import { accountStatusTableConfig, PersistentAccountStatusService } from '../account-status';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import 'aws-sdk-client-mock-vitest/extend';
import { getCurrentTimestamp } from '../../commons/get-current-timestamp';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2023, 2, 13)).getTime());
});

afterAll(() => {
  vi.useRealTimers();
});

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
      getCurrentTimestamp(),
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

    expect(recordServiceUpdateSpy).toHaveBeenLastCalledWith(
      '1234',
      {
        appliedAt: 1678665600000,
        blocked: false,
        history: ['12345|TEST|01||||'],
        intervention: 'AIS_ACCOUNT_SUSPENDED',
        reproveIdentity: false,
        resetPassword: false,
        suspended: true,
        sentAt: 12345,
        updatedAt: 1678665600000,
      },
      {
        RemoveKeys: [],
      },
    );
  });

  test('updateDeleteStatus', async () => {
    const recordService = new InMemoryRecordService<typeof accountStatusTableConfig.schema>([]);

    const recordServiceUpdateSpy = vi.spyOn(recordService, 'update');

    const service = new PersistentAccountStatusService(recordService);

    const res = await service.updateDeleteStatus('1234');

    expect(res).toEqual(undefined);

    expect(recordServiceUpdateSpy).toHaveBeenLastCalledWith(
      '1234',
      {
        deletedAt: 1678665600000,
        isAccountDeleted: true,
        ttl: 1678677945,
      },
      {
        ConditionExpression:
          'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
        ExpressionAttributeValues: {
          ':false': false,
        },
        ReturnValues: 'ALL_NEW',
      },
    );
  });
});

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('PersistentAccountStatusService deep DynamoDB Tests', () => {
  test('updateDeleteStatus', async () => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: {
        deletedAt: 1234,
        isAccountDeleted: true,
        ttl: 5678,
      },
    });

    const recordService = new DynamoDBRecordService<typeof accountStatusTableConfig.schema>(
      accountStatusTableConfig,
      ddbMock as unknown as DynamoDBDocumentClient,
    );

    const service = new PersistentAccountStatusService(recordService);

    const res = await service.updateDeleteStatus('1234');

    expect(res).toEqual({
      Attributes: {
        deletedAt: 1234,
        isAccountDeleted: true,
        ttl: 5678,
      },
    });

    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':deletedAt': 1678665600000,
        ':false': false,
        ':isAccountDeleted': true,
        ':ttl': 1678677945,
      },
      Key: {
        pk: '1234',
      },
      ReturnValues: 'ALL_NEW',
      TableName: 'table_name',
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
    });
  });

  test('updateDeleteStatus throws ConditionalCheckFailedException', async () => {
    ddbMock.on(UpdateCommand).rejects(
      new ConditionalCheckFailedException({
        $metadata: {},
        message: '',
      }),
    );

    const recordService = new DynamoDBRecordService<typeof accountStatusTableConfig.schema>(
      accountStatusTableConfig,
      ddbMock as unknown as DynamoDBDocumentClient,
    );

    const service = new PersistentAccountStatusService(recordService);

    const res = await service.updateDeleteStatus('1234');

    expect(res).toEqual(undefined);

    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':deletedAt': 1678665600000,
        ':false': false,
        ':isAccountDeleted': true,
        ':ttl': 1678677945,
      },
      Key: {
        pk: '1234',
      },
      ReturnValues: 'ALL_NEW',
      TableName: 'table_name',
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
    });
  });

  test('updateDeleteStatus throws generic error', async () => {
    ddbMock.on(UpdateCommand).rejects(new Error('Error message'));

    const recordService = new DynamoDBRecordService<typeof accountStatusTableConfig.schema>(
      accountStatusTableConfig,
      ddbMock as unknown as DynamoDBDocumentClient,
    );

    const service = new PersistentAccountStatusService(recordService);

    await expect(service.updateDeleteStatus('1234')).rejects.toThrow('Error message');

    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(isAccountDeleted) OR isAccountDeleted = :false)',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
        '#isAccountDeleted': 'isAccountDeleted',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':deletedAt': 1678665600000,
        ':false': false,
        ':isAccountDeleted': true,
        ':ttl': 1678677945,
      },
      Key: {
        pk: '1234',
      },
      ReturnValues: 'ALL_NEW',
      TableName: 'table_name',
      UpdateExpression: 'SET #isAccountDeleted = :isAccountDeleted, #ttl = :ttl, #deletedAt = :deletedAt',
    });
  });
});
