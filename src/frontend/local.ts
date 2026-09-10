/* istanbul ignore file -- only use to run locally */

import { InterventionName, InterventionStub } from '@govuk-one-login/ais-status-sdk';
import { FeatureFlagsStub } from '../services/feature-flags';
import { init } from './app';
import { InterventionState } from '../../packages/ais-status-sdk/src/types';
import { StubMessageService } from '../services/message-service';
import { StubAuthoriser } from './authoriser';

init(
  {
    interventionClient: new InterventionStub({
      interventionNames: [InterventionName.RESET_PASSWORD],
      historyResult: {
        lines: [
          {
            sentAt: 1784021279000,
            componentId: 'TEST',
            interventionName: InterventionName.TEMPORARY_SUSPENSION,
            interventionState: InterventionState.ACTIVE,
            interventionReason: 'Reason',
            interventionCode: '01',
            originatingComponent: 'SIRA',
            requesterId: 'interventions@digital.cabinet-office.gov.uk',
            tagId: 'tag1',
          },
          {
            sentAt: 1784022279000,
            componentId: 'TEST',
            interventionName: InterventionName.TEMPORARY_SUSPENSION,
            interventionState: InterventionState.SUPERSEDED,
            interventionReason: 'Reason',
            interventionCode: '03',
            originatingComponent: 'TICF_FAI',
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
            originatingComponent: 'CMS',
            requesterId: 'interventions@digital.cabinet-office.gov.uk',
            tagId: 'tag3',
          },
          {
            sentAt: 1774022279000,
            componentId: 'TEST',
            interventionName: InterventionName.RESET_PASSWORD,
            interventionState: InterventionState.ACTIVE,
            interventionReason: 'Reason not supported',
            interventionCode: '03',
            originatingComponent: 'TICF',
            requesterId: 'interventions@digital.cabinet-office.gov.uk',
            tagId: 'tag4',
          },
          {
            sentAt: 1774022279000,
            componentId: 'TEST',
            interventionName: InterventionName.RESET_PASSWORD,
            interventionState: InterventionState.ACTIVE,
            interventionReason: 'Reason not supported',
            interventionCode: '03',
            originatingComponent: '',
            requesterId: 'interventions@digital.cabinet-office.gov.uk',
            tagId: 'tag5',
          },
        ],
      },
    }),
    messageService: new StubMessageService({
      $metadata: {},
    }),
    authoriser: new StubAuthoriser(),
    config: {
      ...(process.env['SUBPATH'] && { subpath: process.env['SUBPATH'] }),
      ...(process.env['STAGE_PREFIX'] && { stagePrefix: process.env['STAGE_PREFIX'] }),
    },
  },
  {
    featureFlags: new FeatureFlagsStub({ aisFrontend: true, aisSendTxMA: true }),
  },
).listen({ port: 3000 }, (error) => {
  if (error) console.error(error);
  console.log('Server running at http://localhost:3000/');
});
