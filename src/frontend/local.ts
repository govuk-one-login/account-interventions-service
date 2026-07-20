/* istanbul ignore file -- only use to run locally */

import { InterventionName, InterventionStub } from '@govuk-one-login/ais-status-sdk';
import { FeatureFlagsStub } from '../services/feature-flags';
import { init } from './app';
import { InterventionState } from '../../packages/ais-status-sdk/src/types';
import { StubMessageService } from '../services/message-service';

init(
  new InterventionStub({
    interventionNames: [InterventionName.RESET_PASSWORD, InterventionName.REPROVE_IDENTITY],
    historyResult: {
      lines: [
        {
          sentAt: 1784021279000,
          componentId: 'TEST',
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '01',
          originatingComponent: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'tag1',
        },
        {
          sentAt: 1784021289000,
          componentId: 'TEST',
          interventionName: InterventionName.REPROVE_IDENTITY,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '03',
          originatingComponent: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'tag2a',
        },
        {
          sentAt: 1784022279000,
          componentId: 'TEST',
          interventionName: InterventionName.TEMPORARY_SUSPENSION,
          interventionState: InterventionState.SUPERSEDED,
          interventionReason: 'Reason',
          interventionCode: '03',
          originatingComponent: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'tag2',
        },
        {
          sentAt: 1784022279000,
          componentId: 'TEST',
          interventionName: InterventionName.RESET_PASSWORD,
          interventionState: InterventionState.ACTIVE,
          interventionReason: 'Reason',
          interventionCode: '03',
          originatingComponent: 'TICF',
          requesterId: 'interventions@digital.cabinet-office.gov.uk',
          tagId: 'tag2',
        },
      ],
    },
  }),
  new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
  new StubMessageService({
    $metadata: {},
  }),
).listen({ port: 3000 }, (error) => {
  if (error) console.error(error);
  console.log('Server running at http://localhost:3000/');
});
