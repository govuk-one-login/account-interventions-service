/* istanbul ignore file -- only use to run locally */

import { InterventionName, InterventionStub } from '@govuk-one-login/ais-status-sdk';
import { FeatureFlagsStub } from '../services/feature-flags';
import { init } from './app';
import { InterventionState } from '../../packages/ais-status-sdk/src/types';

init(
  new InterventionStub({
    interventionNames: [InterventionName.RESET_PASSWORD],
    historyResult: {
      history: [
        {
          sentAt: 1784021279000,
          componentId: 'TEST',
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '01',
          originatingComponent: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
        },
      ],
    },
  }),
  new FeatureFlagsStub({ aisFrontend: true }),
).listen({ port: 3000 }, (error) => {
  if (error) console.error(error);
  console.log('Server running at http://localhost:3000/');
});
