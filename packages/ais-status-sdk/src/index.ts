import type { V2Response } from '../../../src/data-types/api-schemas-v2';
import type { AccountStatusResult } from './types';

export interface InterventionClientConfig {
  baseUrl: string;
}

export interface InterventionClientInterface {
  getAccountStatus(userId: string): Promise<AccountStatusResult>;
}

export class InterventionClient implements InterventionClientInterface {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: InterventionClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };
  }

  private async fetchAccountStatus(userId: string): Promise<V2Response> {
    const url = `${this.baseUrl}/v2/ais/${encodeURIComponent(userId)}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`AIS request failed: ${response.status.toString()} ${response.statusText}`);
    }

    return response.json() as Promise<V2Response>;
  }

  async getAccountStatus(userId: string): Promise<AccountStatusResult> {
    const result = await this.fetchAccountStatus(userId);

    return result;
  }
}
