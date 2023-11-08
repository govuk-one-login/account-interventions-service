import { EventsEnum } from './constants';

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
  constructor(message: string, transition: EventsEnum) {
    super(message);
    this.name = 'StateTransitionError';
    this.transition = transition;
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
