// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const path = require('node:path');
import pkg from '@pact-foundation/pact-node';
const { publishPacts } = pkg;

const publishPact = async () => {
  console.log('STARTING PUBLISH PACT');
  try {
    const publishOptions = {
      pactFilesOrDirs: [path.resolve(process.cwd(), 'pacts')],
      pactBroker: process.env['PACT_BROKER_URL']!,
      pactBrokerUsername: process.env['PACT_BROKER_USER']!,
      pactBrokerPassword: process.env['PACT_BROKER_PASSWORD']!,
      logLevel: 'info',
      consumerVersion: process.env['CONSUMER_APP_VERSION']!,
      branch: process.env['GIT_BRANCH']!,
    };

    await publishPacts(publishOptions);
  } catch (error) {
    console.error('UNABLE TO PUBLISH PACTS', error);
    process.exitCode = 1;
  }
};

void publishPact();
