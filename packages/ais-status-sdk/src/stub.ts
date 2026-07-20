import { InterventionRequestFailed } from './errors';
import { AccountHistory, AccountStatus, InterventionClientInterface, InterventionName } from './types';

export interface InterventionStubConfig {
  result?: AccountStatus;
  interventionNames?: InterventionName[];
  historyResult?: AccountHistory;
}

export class InterventionStub implements InterventionClientInterface {
  constructor(readonly config?: InterventionStubConfig) {}

  getAccountStatus(): Promise<AccountStatus> {
    if (this.config?.result) return Promise.resolve(this.config.result);

    if (this.config?.interventionNames)
      return Promise.resolve({
        interventions: this.config.interventionNames.map((name) => ({ name })),
      });

    throw new InterventionRequestFailed();
  }

  getAccountHistory(): Promise<AccountHistory> {
    if (this.config?.historyResult) return Promise.resolve(this.config.historyResult);

    throw new InterventionRequestFailed();
  }
}
