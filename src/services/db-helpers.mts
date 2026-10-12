export const generateExpressionAttributeNames = (keys: string[]) =>
  Object.fromEntries(keys.map((key) => [`#${key}`, key]));

export const generateExpressionAttributeValues = (input: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(input).map(([key, value]) => [`:${key}`, value]));

export const generateUpdateExpressionClause = (keys: string[], keysToRemove?: string[]) =>
  `SET ${keys.map((key) => keyToUpdateExpressionClause(key)).join(', ')}${keysToRemoveExpressionClause(keysToRemove)}`;

const keyToUpdateExpressionClause = (key: string) => `#${key} = :${key}`;

export const keysToRemoveExpressionClause = (keysToRemove?: string[]) =>
  keysToRemove && keysToRemove.length > 0 ? ` REMOVE ${keysToRemove.join(', ')}` : '';
