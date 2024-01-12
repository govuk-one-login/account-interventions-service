const seconds = 12_345;
const ms = 12_345_000;

interface Event {
  timestamp: number;
  event_timestamp_ms: number;
  event_name: string;
  component_id: string;
  client_id?: string;
  user: {
    user_id: string;
    email?: string;
    phone?: string;
    ip_address?: string;
    session_id?: string;
    persistent_session_id?: string;
    govuk_signin_journey_id?: string;
  };
  extensions?: object;
}

export const aisEvents: {
  [key: string]: Event;
} = {
  suspendNoAction: {
    timestamp: seconds,
    event_timestamp_ms: ms,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '01',
        intervention_reason: 'suspend - 01',
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
        intervention_reason: 'unsuspend - 02',
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
        intervention_reason: 'block - 03',
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
        intervention_reason: 'password reset - 04',
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
        intervention_reason: 'id reset - 05',
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
        intervention_reason: 'password and id reset - 06',
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
        intervention_reason: 'unblock - 07',
      },
    },
  },

  userActionIdResetSuccess: {
    event_name: 'IPV_IDENTITY_ISSUED',
    timestamp: seconds,
    event_timestamp_ms: ms,
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
    event_timestamp_ms: ms,
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
