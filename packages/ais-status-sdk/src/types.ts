export enum InterventionName {
  PERMANENT_SUSPENSION = 'PERMANENT_SUSPENSION',
  TEMPORARY_SUSPENSION = 'TEMPORARY_SUSPENSION',
  RESET_PASSWORD = 'RESET_PASSWORD', //pragma: allowlist secret
  REPROVE_IDENTITY = 'REPROVE_IDENTITY',
}

export interface Intervention {
  name: InterventionName | string;
}

export interface AccountStatusResult {
  interventions: Intervention[];
}

type LogAttributes = Record<string, unknown>;

type LogItemExtraInput = [Error | string] | LogAttributes[];

interface Logger {
  error(input: string, ...extraInput: LogItemExtraInput): void;
}

export interface InterventionClientConfig {
  baseUrl: string | undefined;
  logger?: Logger;
}

export interface InterventionClientInterface {
  getAccountStatus(userId: string): Promise<AccountStatusResult>;
}
