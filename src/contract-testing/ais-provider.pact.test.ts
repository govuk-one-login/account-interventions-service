import { jsonUrl } from '../../api-client/api-client-utils';
import { VerifierOptions, Verifier } from "@pact-foundation/pact"
import { localApiServer } from './local-api-server';

const local = new localApiServer('ais/testUserId');
const config: VerifierOptions = {
    providerBaseUrl: `http://127.0.0.1/3000`,
    pactUrls: [jsonUrl],
    provider: 'Account Intervention Service',
    stateHandlers: {
      'provider is healthy': async () => {
        await local.createLocalServer();
      },
    //   'a non existing user account': async () => {
        
    //   },
    //   'an existing user with no intervention status': async () => {
  
    //   },
    //   'a request without userId passed in': async () => {
  
    //   },
    //   'a request to get a users information from an unhealthy provider': async () => {
  
    //   },
    //   'when a 502 status code is returned from a GET request': async () => {
  
    //   },
    //   'will return 504 and a gateway timeout message': async () => {
  
    //   },
    //   'will return an unexpected error message': async () => {
  
    //   }
    }
  }

  describe('PACT verification', () => {
    beforeEach(() => {
        jest.resetModules();
        // process.env['TEST_ENVIRONMENT'] === 'dev';
        // process.env['AWS_REGION'] === 'eu-west-2';
        // process.env['SAM_STACK_NAME'] === 'ais-main';
      });
    it('will verify the json file', async () => {
      const verify = new Verifier(config);
      await verify.verifyProvider();
    })
  })
  