import {
  V2HistoryResponse,
  V2HistoryResponseSchema,
  V2ResponseSchema,
  type V2Response,
} from '../../../src/data-types/api-schemas-v2';
import { version } from '../package.json';
import type { AccountHistory, AccountStatus, InterventionClientConfig, InterventionClientInterface } from './types';
export type {
  AccountStatus,
  InterventionClientConfig,
  InterventionClientInterface,
  Intervention,
  AccountHistory,
  HistoryLine,
} from './types';
export { InterventionName, InterventionState } from './types';
import { InterventionInvalidResponse, InterventionMissingBaseUrl, InterventionRequestFailed } from './errors';
import { ZodSafeParseError } from 'zod';
export type { InterventionInvalidResponse, InterventionRequestFailed, InterventionMissingBaseUrl } from './errors';
export { InterventionStub } from './stub';

export class InterventionClient implements InterventionClientInterface {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(
    baseUrl: string | undefined,
    readonly config?: InterventionClientConfig,
  ) {
    if (!baseUrl) throw new InterventionMissingBaseUrl('Missing required baseUrl');

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json', 'x-sdk-version': version };
  }

  protected async fetch(url: string): Promise<unknown> {
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      this.config?.logger?.error(`AIS request failed: ${response.status.toString()} ${response.statusText}`);
      throw new InterventionRequestFailed(`AIS request failed: ${response.status.toString()} ${response.statusText}`);
    }

    const responseBody: unknown = await response.json();

    return responseBody;
  }

  protected handleInvalidResponse(parseResult: ZodSafeParseError<object>): never {
    this.config?.logger?.error('AIS Invalid Response', { cause: parseResult.error });
    throw new InterventionInvalidResponse('AIS Invalid Response', { cause: parseResult.error });
  }

  protected async fetchAccountStatus(userId: string): Promise<V2Response> {
    const url = `${this.baseUrl}/v2/ais/${encodeURIComponent(userId)}`;

    const response = await this.fetch(url);

    const parseResult = V2ResponseSchema.safeParse(response);

    if (!parseResult.success) this.handleInvalidResponse(parseResult);

    return parseResult.data;
  }

  protected async fetchAccountHistory(userId: string): Promise<V2HistoryResponse> {
    const url = `${this.baseUrl}/v2/ais/${encodeURIComponent(userId)}/history`;

    const response = await this.fetch(url);

    const parseResult = V2HistoryResponseSchema.safeParse(response);

    if (!parseResult.success) this.handleInvalidResponse(parseResult);

    return parseResult.data;
  }

  async getAccountStatus(userId: string): Promise<AccountStatus> {
    const result = await this.fetchAccountStatus(userId);

    return result;
  }

  async getAccountHistory(userId: string): Promise<AccountHistory> {
    const result = await this.fetchAccountHistory(userId);

    return result;
  }
}
