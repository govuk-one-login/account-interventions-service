export class InvalidEnvironmentVariableError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'InvalidEnvironmentVariableError';
  }
}

export class StateTransitionErrorIgnored extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateTransitionErrorIgnoredError';
  }
}
