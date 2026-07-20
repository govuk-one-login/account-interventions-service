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

export interface AccountStatus {
  interventions: Intervention[];
}

export interface HistoryLine {
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
  /**
   * Internal grouping id for several HistoryLines which were created by one user action
   *
   * For lines from InterventionEvents will be transactionId, otherwise random UUID.
   */
  tagId: string;
}

export interface AccountHistory {
  lines: HistoryLine[];
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
  getAccountStatus(userId: string): Promise<AccountStatus>;
  getAccountHistory(userId: string): Promise<AccountHistory>;
}
