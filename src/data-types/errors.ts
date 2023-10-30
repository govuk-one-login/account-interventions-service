export class InvalidEnvironmentVariableError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'InvalidEnvironmentVariableError';
  }
}

export class StateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateTransitionErrorIgnoredError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationErrorIgnoredError';
  }
}
