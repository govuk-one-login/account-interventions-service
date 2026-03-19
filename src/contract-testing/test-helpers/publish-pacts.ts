import path from 'node:path';
import pact from '@pact-foundation/pact-cli';
import getEnvOrThrow from '../../commons/get-env-or-throw';

const publishPact = async () => {
  console.log('STARTING PUBLISH PACT');
  try {
    const publishOptions = {
      pactFilesOrDirs: [path.resolve(process.cwd(), 'pacts')],
      pactBroker: getEnvOrThrow('PACT_BROKER_URL'),
      pactBrokerUsername: getEnvOrThrow('PACT_BROKER_USER'),
      pactBrokerPassword: getEnvOrThrow('PACT_BROKER_PASSWORD'),
      logLevel: 'info',
      consumerVersion: getEnvOrThrow('CONSUMER_APP_VERSION'),
      branch: getEnvOrThrow('GIT_BRANCH'),
    };

    await pact.publishPacts(publishOptions);
  } catch (error) {
    console.error('UNABLE TO PUBLISH PACTS', error);
    process.exitCode = 1;
  }
};

void publishPact();
