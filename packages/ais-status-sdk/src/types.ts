export enum InterventionName {
  PERMANENT_SUSPENSION = 'PERMANENT_SUSPENSION',
  TEMPORARY_SUSPENSION = 'TEMPORARY_SUSPENSION',
  RESET_PASSWORD = 'RESET_PASSWORD', //pragma: allowlist secret
  REPROVE_IDENTITY = 'REPROVE_IDENTITY',
}

export enum InterventionState {
  ACTIVE = 'ACTIVE',
  IGNORED = 'IGNORED',
  SUPERSEDED = 'SUPERSEDED',
  MITIGATED = 'MITIGATED',
  REMOVED = 'REMOVED',
}

export interface Intervention {
  name: InterventionName | string;
}

export interface AccountStatusResult {
  interventions: Intervention[];
}

export interface HistoryObject {
  sentAt: number;
  componentId: string;
  interventionName: InterventionName;
  interventionState: InterventionState;
  interventionCode?: string | undefined;
  interventionReason: string;
  originatingComponent?: string | undefined;
  originatorReferenceId?: string | string[] | undefined;
  requesterId?: string | undefined;
  transactionId?: string | undefined;
  messageEventId?: string | undefined;
}

export interface AccountHistoryResult {
  history: HistoryObject[];
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
  getAccountHistory(userId: string): Promise<AccountHistoryResult>;
}
