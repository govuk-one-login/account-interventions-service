// Stryker disable StringLiteral: Testing against the name of an exception class is just a change-detector test
import { EventsEnum } from './constants';
import { AccountStateEngineOutput, TxMAEgressInterventionEventName } from './interfaces';

/**
 * Describes the audit event that should be emitted as a consequence of an error, without
 * performing the emission. Validation functions attach this to the error they throw so that
 * the central SQS processing function remains the single place that actually sends audit events.
 */
export interface AuditEventIntent {
  egressEventName: TxMAEgressInterventionEventName;
  accountStateEngineOutput?: AccountStateEngineOutput;
}

export class InvalidEnvironmentVariableError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'InvalidEnvironmentVariableError';
  }
}

export class StateEngineConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateEngineConfigError';
  }
}
export class StateTransitionError extends Error {
  public transition: EventsEnum;
  public output: AccountStateEngineOutput;
  constructor(message: string, transition: EventsEnum, output: AccountStateEngineOutput) {
    super(message);
    this.name = 'StateTransitionError';
    this.transition = transition;
    this.output = output;
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly auditEvent?: AuditEventIntent,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TooManyRecordsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TooManyRecordsError';
  }
}

export class RetryEventError extends Error {
  constructor(
    message: string,
    public readonly auditEvent?: AuditEventIntent,
  ) {
    super(message);
    this.name = 'RetryEventError';
  }
}
