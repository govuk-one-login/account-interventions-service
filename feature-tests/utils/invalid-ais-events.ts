export const invalidAisEvents = {
  missingEventNameAndId: {
    timestamp: 1234,
    event_timestamp_ms: 1_234_000,
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
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
  },

  EmptyData: {
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
  },

  invaidJsonEvent: {
    timestamp: 1234,
    event_timestamp_ms: 1_234_000,
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
};
