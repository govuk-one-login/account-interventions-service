import { V2ResponseSchema, type V2Response } from '../../../src/data-types/api-schemas-v2';
import type { AccountStatusResult, InterventionClientConfig, InterventionClientInterface } from './types';
export type { AccountStatusResult, InterventionClientConfig, InterventionClientInterface, Intervention } from './types';
export { InterventionName } from './types';
import { InterventionInvalidResponse, InterventionMissingBaseUrl, InterventionRequestFailed } from './errors';
export type { InterventionInvalidResponse, InterventionRequestFailed, InterventionMissingBaseUrl } from './errors';
export { InterventionStub } from './stub';

export class InterventionClient implements InterventionClientInterface {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: InterventionClientConfig) {
    if (!config.baseUrl) throw new InterventionMissingBaseUrl('Missing required baseUrl');

    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };
  }

  private async fetchAccountStatus(userId: string): Promise<V2Response> {
    const url = `${this.baseUrl}/v2/ais/${encodeURIComponent(userId)}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new InterventionRequestFailed(`AIS request failed: ${response.status.toString()} ${response.statusText}`);
    }

    const responseBody: unknown = await response.json();

    const parseResult = V2ResponseSchema.safeParse(responseBody);

    if (!parseResult.success)
      throw new InterventionInvalidResponse('AIS Invalid Response', { cause: parseResult.error });

    return parseResult.data;
  }

  async getAccountStatus(userId: string): Promise<AccountStatusResult> {
    const result = await this.fetchAccountStatus(userId);

    return result;
  }
}
