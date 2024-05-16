import { EventsEnum } from './constants';
import { AccountStateEngineOutput } from './interfaces';

export class InvalidEnvironmentVariableError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'InvalidEnvironmentVariableError';
  }
}

export class StateEngineConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateEngineConfigurationError';
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
  constructor(message: string) {
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
  constructor(message: string) {
    super(message);
    this.name = 'RetryEventError';
  }
}
