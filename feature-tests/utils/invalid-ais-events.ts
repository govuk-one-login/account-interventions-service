import { CurrentTimeDescriptor } from './utility';

const currentTime = getCurrentTimestamp();
const futureTime = getFutureTimestamp();
const pastTime = getPastTimestamp();

export const invalidAisEvents = {
  missingEventNameAndId: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '01',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  missingTimeStamps: {
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '01',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  missingExtensions: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
  },

  EmptyData: {
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
  },

  invalidInterventionCodeType: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: 1,
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  invalidInterventionCode: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '09',
        intervention_reason: 'suspend - 09',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  invalidInterventionCodeWithSpecialCharacters: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '*&',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  invalidInterventionCodeWithBooleanValues: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: 'true',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  invalidInterventionCodeWithSpace: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '0 1',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  invalidInterventionCodeWithEmptyValues: {
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  suspendedEventWithFutureTimeStamp: {
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    timestamp: futureTime.seconds,
    event_timestamp_ms: futureTime.milliseconds,
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '01',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  blockEventWithPastTimeStamp: {
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    timestamp: pastTime.seconds,
    event_timestamp_ms: pastTime.milliseconds,
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '03',
        intervention_reason: 'block - 03',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  userActionIdResetSuccess: {
    event_name: 'IPV_IDENTITY_ISSUED',
    event_id: '123',
    timestamp: currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
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
      levelOfConfidence: 'P1',
      ciFail: false,
      hasMitigations: false,
    },
  },
};

function getCurrentTimestamp(date = new Date()): CurrentTimeDescriptor {
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}

export function getFutureTimestamp(date = new Date()): CurrentTimeDescriptor {
  date.setFullYear(date.getFullYear() + 2);
  date.setMonth(date.getMonth() + 2);
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}

export function getPastTimestamp(date = new Date()): CurrentTimeDescriptor {
  const min = 5;
  date.setMinutes(date.getMinutes() - min);
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}
