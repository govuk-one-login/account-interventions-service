const now = Date.now();
const ageInSeconds = 1;
const seconds = now / 1000 - ageInSeconds;
const ms = seconds * 1000;

export const aisEvents = {
  suspendNoAction: {
    timestamp: seconds,
    event_timestamp_ms: ms,
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

  unSuspendAction: {
    timestamp: seconds,
    event_timestamp_ms: ms,
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

  block: {
    timestamp: seconds,
    event_timestamp_ms: ms,
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

  pswResetRequired: {
    timestamp: seconds,
    event_timestamp_ms: ms,
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

  idResetRequired: {
    timestamp: seconds,
    event_timestamp_ms: ms,
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

  pswAndIdResetRequired: {
    timestamp: seconds,
    event_timestamp_ms: ms,
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

  unblock: {
    timestamp: seconds,
    event_timestamp_ms: ms,
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

  userActionIdResetSuccess: {
    event_name: 'IPV_IDENTITY_ISSUED',
    timestamp: seconds,
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

  userActionPswResetSuccess: {
    event_name: 'AUTH_PASSWORD_RESET_SUCCESSFUL',
    timestamp: seconds,
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
};
