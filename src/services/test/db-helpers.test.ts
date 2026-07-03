import { keysToRemoveExpressionClause } from '../db-helpers';

describe('keysToRemoveExpressionClause', () => {
  test('with single key to remove', () => {
    expect(keysToRemoveExpressionClause(['key1'])).toEqual(' REMOVE key1');
  });

  test('with multiple keys to remove', () => {
    expect(keysToRemoveExpressionClause(['key1', 'key2'])).toEqual(' REMOVE key1, key2');
  });

  test('with no keys to remove', () => {
    expect(keysToRemoveExpressionClause()).toEqual('');
  });

  test('with empty list of keys to remove', () => {
    expect(keysToRemoveExpressionClause([])).toEqual('');
  });
});
