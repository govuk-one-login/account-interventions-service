import getEnvironmentOrThrow from '../commons/get-environment-or-throw';
import { V1Response, V1ResponseSchema } from '../data-types/api-schemas-v1';

export interface InterventionClientInterfaceV1 {
  getAccountHistory(userId: string): Promise<V1Response>;
}

export class InterventionClientV1 implements InterventionClientInterfaceV1 {
  async fetchAccountHistory(userId: string): Promise<V1Response> {
    const url = getEnvironmentOrThrow('STATUS_API_URL');

    const baseUrl = url.replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/v1/ais/${encodeURIComponent(userId)}?history=true`);

    const responseBody: unknown = await response.json();

    const parseResult = V1ResponseSchema.safeParse(responseBody);

    if (!parseResult.success) throw new Error('AIS Invalid Response', { cause: parseResult.error });

    return parseResult.data;
  }

  getAccountHistory(userId: string): Promise<V1Response> {
    return this.fetchAccountHistory(userId);
  }
}

export class InterventionStubV1 implements InterventionClientInterfaceV1 {
  constructor(readonly output: V1Response) {}

  getAccountHistory(_userId: string): Promise<V1Response> {
    return Promise.resolve(this.output);
  }
}
