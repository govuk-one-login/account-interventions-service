import { CurrentTimeDescriptor } from "./utility";


const currentTime = getCurrentTimestamp();

export const invalidAisEvents = {
  missingEventNameAndId: {
    timestamp:currentTime.seconds,
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
    timestamp:currentTime.seconds,
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
    timestamp:currentTime.seconds,
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
    timestamp:currentTime.seconds,
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
    timestamp:currentTime.seconds,
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
    timestamp:currentTime.seconds,
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
    timestamp:currentTime.seconds,
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

  invalidInterventionCodeWithSpaces: {
    timestamp:currentTime.seconds,
    event_timestamp_ms: currentTime.milliseconds,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: ' 01 ',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },

  invalidInterventionCodeWithEmptyValues: {
    timestamp:currentTime.seconds,
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
};

function getCurrentTimestamp(date = new Date()) :CurrentTimeDescriptor  {
  return {
    milliseconds: date.valueOf(),
    isoString: date.toISOString(),
    seconds: Math.floor(date.valueOf() / 1000),
  };
}
