export const aisEvents = {
  suspendNoAction: [
    {
      timestamp: 1234,
      event_timestamp_ms: 1_234_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '01',
          intervention_reason: 'something',
        },
      },
    },
  ],

  unSuspendAction: [
    {
      timestamp: 1234,
      event_timestamp_ms: 1_234_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '02',
          intervention_reason: 'something',
        },
      },
    },
  ],
  block: [
    {
      timestamp: 1234,
      event_timestamp_ms: 1_234_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '03',
          intervention_reason: 'something',
        },
      },
    },
  ],
  pswResetRequired: [
    {
      timestamp: 1234,
      event_timestamp_ms: 1_234_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '04',
          intervention_reason: 'something',
        },
      },
    },
  ],
  idResetRequired: [
    {
      timestamp: 1234,
      event_timestamp_ms: 1_234_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '05',
          intervention_reason: 'something',
        },
      },
    },
  ],
  pswAndIdResetRequired: [
    {
      timestamp: 1234,
      event_timestamp_ms: 1_234_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '06',
          intervention_reason: 'something',
        },
      },
    },
  ],
  unblock: [
    {
      timestamp: 1234,
      event_timestamp_ms: 1_234_000,
      event_name: 'TICF_ACCOUNT_INTERVENTION',
      component_id: 'TICF_CRI',
      user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
      extensions: {
        intervention: {
          intervention_code: '07',
          intervention_reason: 'something',
        },
      },
    },
  ],
  userActionIdResetSuccess: [
    {
      event_name: 'IPV_IDENTITY_ISSUED',
      timestamp: 1_234_567,
      client_id: 'UNKNOWN',
      component_id: 'UNKNOWN',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        email: '',
        phone: 'UNKNOWN',
        ip_address: '',
        session_id: '',
        persistent_session_id: '',
        govuk_signin_journey_id: '',
      },
      extensions: {
        levelOfConfidence: 'P2',
        ciFail: false,
        hasMitigations: false,
      },
    },
  ],
  userActionPswResetSuccess: [
    {
      event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
      timestamp: 1_697_629_119,
      client_id: 'UNKNOWN',
      component_id: 'UNKNOWN',
      user: {
        user_id: 'urn:fdc:gov.uk:2022:USER_ONE',
        email: '',
        phone: 'UNKNOWN',
        ip_address: '',
        session_id: '',
        persistent_session_id: '',
        govuk_signin_journey_id: '',
      },
    },
  ],
};
