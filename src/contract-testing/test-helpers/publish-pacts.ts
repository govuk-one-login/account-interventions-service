import path from 'node:path';
import pact from '@pact-foundation/pact-cli';

const publishPact = async () => {
  console.log('STARTING PUBLISH PACT');
  try {
    const publishOptions = {
      pactFilesOrDirs: [path.resolve(process.cwd(), 'pacts')],
      pactBroker: process.env['PACT_BROKER_URL'] as string,
      pactBrokerUsername: process.env['PACT_BROKER_USER'] as string,
      pactBrokerPassword: process.env['PACT_BROKER_PASSWORD'] as string,
      logLevel: 'info',
      consumerVersion: process.env['CONSUMER_APP_VERSION'] as string,
      branch: process.env['GIT_BRANCH'] as string,
    };

    await pact.publishPacts(publishOptions);
  } catch (error) {
    console.error('UNABLE TO PUBLISH PACTS', error);
    process.exitCode = 1;
  }
};

void publishPact();
