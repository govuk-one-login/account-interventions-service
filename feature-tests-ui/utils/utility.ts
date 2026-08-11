const delay = (ms: number | undefined) => new Promise((resolve) => setTimeout(resolve, ms));

export async function timeDelayForTestEnvironment(ms = 500) {
  console.log('Wait for endpoint operations to process');
  await delay(ms);
}

export function randomString(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export interface CurrentTimeDescriptor {
  isoString: string;
  milliseconds: number;
  seconds: number;
}

export type InformationFromTable = {
  updatedAt: number;
  appliedAt: number;
  sentAt: number;
  intervention: string;
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
  history?: string;
  auditLevel?: string;
  isAccountDeleted?: boolean;
  reprovedIdentityAt?: number;
  resetPasswordAt?: number;
  deletedAt?: number;
  ttl?: number;
  pk?: string;
};

export function attemptParseJSON(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.log('Error parsing JSON', { error });
    return {};
  }
}

export function getPastTimestamp(date = new Date()): CurrentTimeDescriptor {
  date.setFullYear(date.getFullYear() - 2);
  date.setMonth(date.getMonth() - 2);
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}
