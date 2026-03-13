//required to connect to PactBroker as Pact libraries don't allow testSource parameter to be passed
function connectToPactBroker(pact_url: string, pact_user: string, pact_password: string): string {
  const auth = btoa(`${pact_user}:${pact_password}`);

  void fetch(pact_url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  }).then(function (response) {
    if (response.ok) {
      console.log('PACT BROKER AUTHORIZED SUCCESSFULLY VIA PROVIDER');
      return response.status;
    }
    console.log('ERROR AUTHORIZING PACT BROKER');
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw response;
  });
  return '';
}

connectToPactBroker(
  (process.env['PACT_BROKER_URL'] as string) + '?testSource=' + (process.env['PACT_BROKER_SOURCE_SECRET'] as string),
  process.env['PACT_BROKER_USER'] as string,
  process.env['PACT_BROKER_PASSWORD'] as string,
);
