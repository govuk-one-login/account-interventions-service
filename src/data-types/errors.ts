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
  public transitionCode: string | undefined;
  constructor(message: string, transition: EventsEnum, transitionCode?: string) {
    super(message);
    this.name = 'StateTransitionError';
    this.transition = transition;
    this.transitionCode = transitionCode;
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
