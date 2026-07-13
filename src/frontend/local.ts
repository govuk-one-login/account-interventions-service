/* istanbul ignore file -- only use to run locally */

import { InterventionName, InterventionStub } from '@govuk-one-login/ais-status-sdk';
import { FeatureFlagsStub } from '../services/feature-flags';
import { init } from './app';

init(
  new InterventionStub({
    interventionNames: [InterventionName.RESET_PASSWORD],
  }),
  new FeatureFlagsStub({ aisFrontend: true }),
).listen({ port: 3000 }, (error) => {
  if (error) console.error(error);
  console.log('Server running at http://localhost:3000/');
});
