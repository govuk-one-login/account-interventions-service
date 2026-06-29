/* eslint-disable unicorn/prefer-top-level-await */
import path from 'node:path';
import pact from '@pact-foundation/pact-cli';
import getEnvironmentOrThrow from '../../commons/get-environment-or-throw';

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
