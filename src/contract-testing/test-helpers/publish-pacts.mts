import path from 'node:path';
import * as pactModule from '@pact-foundation/pact-cli';
import getEnvironmentOrThrow from '../../commons/get-environment-or-throw.mts';

interface PactCli {
  publishPacts(options: Record<string, unknown>): Promise<unknown>;
}

// @pact-foundation/pact-cli's default export isn't typed as callable under
// NodeNext module resolution (a known TypeScript limitation with CJS default
// exports — see github.com/microsoft/TypeScript/issues/49189 and #52086).
// Asserted to a minimal local interface covering only the method used here.
const pact = pactModule.default as unknown as PactCli;

const publishPact = async () => {
  console.log('STARTING PUBLISH PACT');
  try {
    const publishOptions = {
      pactFilesOrDirs: [path.resolve(process.cwd(), 'pacts')],
      pactBroker: getEnvironmentOrThrow('PACT_BROKER_URL'),
      pactBrokerUsername: getEnvironmentOrThrow('PACT_BROKER_USER'),
      pactBrokerPassword: getEnvironmentOrThrow('PACT_BROKER_PASSWORD'),
      logLevel: 'info',
      consumerVersion: getEnvironmentOrThrow('CONSUMER_APP_VERSION'),
      branch: getEnvironmentOrThrow('GIT_BRANCH'),
    };

    await pact.publishPacts(publishOptions);
  } catch (error) {
    console.error('UNABLE TO PUBLISH PACTS', error);
    process.exitCode = 1;
  }
};

void publishPact();
