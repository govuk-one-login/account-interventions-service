import { InterventionRequestFailed } from './errors';
import { AccountStatusResult, InterventionClientInterface, InterventionName } from './types';

export interface InterventionStubConfig {
  result?: AccountStatusResult;
  interventionNames?: InterventionName[];
}

export class InterventionStub implements InterventionClientInterface {
  constructor(readonly config?: InterventionStubConfig) {}

  getAccountStatus(): Promise<AccountStatusResult> {
    if (this.config?.result) return Promise.resolve(this.config.result);

    if (this.config?.interventionNames)
      return Promise.resolve({
        interventions: this.config.interventionNames.map((name) => ({ name })),
      });

    throw new InterventionRequestFailed();
  }
}
