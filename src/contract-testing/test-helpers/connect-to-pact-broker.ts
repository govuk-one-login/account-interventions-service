/* eslint-disable unicorn/prefer-top-level-await */
import getEnvironmentOrThrow from '../../commons/get-environment-or-throw';

//required to connect to PactBroker as Pact libraries don't allow testSource parameter to be passed
async function connectToPactBroker(pact_url: string, pact_user: string, pact_password: string): Promise<number> {
  const auth = btoa(`${pact_user}:${pact_password}`);

  const response = await fetch(pact_url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (response.ok) {
    console.log('PACT BROKER AUTHORIZED SUCCESSFULLY VIA PROVIDER');

    return response.status;
  }

  console.log('ERROR AUTHORIZING PACT BROKER');
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw response;
}

const run = async () => {
  try {
    await connectToPactBroker(
      getEnvironmentOrThrow('PACT_BROKER_URL') + '?testSource=' + getEnvironmentOrThrow('PACT_BROKER_SOURCE_SECRET'),
      getEnvironmentOrThrow('PACT_BROKER_USER'),
      getEnvironmentOrThrow('PACT_BROKER_PASSWORD'),
    );
  } catch (error) {
    console.error('FAILED TO CONNECT TO PACT BROKER', error);
    process.exitCode = 1;
  }
};

void run();
