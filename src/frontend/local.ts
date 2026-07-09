/* istanbul ignore file -- only use to run locally */

import { InterventionName, InterventionStub } from '@govuk-one-login/ais-status-sdk';
import { init } from './app';
import { InterventionStubV1 } from './intervention-client-v1';
import { AISInterventionTypes } from '../data-types/constants';
import { getCurrentTimestamp } from '../commons/get-current-timestamp';

init(
  new InterventionStub({
    interventionNames: [InterventionName.RESET_PASSWORD],
  }),
  new InterventionStubV1({
    intervention: {
      updatedAt: getCurrentTimestamp().milliseconds,
      appliedAt: getCurrentTimestamp().milliseconds,
      sentAt: getCurrentTimestamp().milliseconds,
      description: AISInterventionTypes.AIS_NO_INTERVENTION,
    },
    state: {
      blocked: false,
      suspended: false,
      resetPassword: false,
      reproveIdentity: false,
    },
    auditLevel: 'standard',
    history: [
      {
        sentAt: '2026-06-10T13:39:18.648Z',
        component: 'TEST_EATL',
        code: '01',
        intervention: 'FRAUD_SUSPEND_ACCOUNT',
        reason: '03',
        originatingComponent: 'TEST_EATL',
        requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
      },
      {
        sentAt: '2026-06-10T13:42:38.889Z',
        component: 'TEST_EATL',
        code: '02',
        intervention: 'FRAUD_UNSUSPEND_ACCOUNT',
        reason: '03',
        originatingComponent: 'TEST_EATL',
        requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
      },
      {
        sentAt: '2026-06-10T13:43:12.624Z',
        component: 'TEST_EATL',
        code: '06',
        intervention: 'FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION',
        reason: '03',
        originatingComponent: 'TEST_EATL',
        requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
      },
      {
        sentAt: '2026-06-10T13:44:17.172Z',
        component: 'TEST_EATL',
        code: '06',
        intervention: 'FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION',
        reason: '03',
        originatingComponent: 'TEST_EATL',
        requesterId: 'edward.louth@digital.cabinet-office.gov.uk',
      },
    ],
  }),
).listen({ port: 3000 }, (error) => {
  if (error) console.error(error);
  console.log('Server running at http://localhost:3000/');
});
