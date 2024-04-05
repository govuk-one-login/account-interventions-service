export const aisEventsWithEnhancedFields = {
  suspendNoActionWithEnhancedExtensions: {
    timestamp: 12_345,
    event_timestamp_ms: 12_345_000,
    event_name: 'TICF_ACCOUNT_INTERVENTION',
    event_id: '123',
    component_id: 'TICF_CRI',
    user: { user_id: 'urn:fdc:gov.uk:2022:USER_ONE' },
    extensions: {
      intervention: {
        intervention_code: '01',
        a_new_field_number: '075394400947554',
        a_new_field_string: 'testing',
        intervention_reason: 'suspend - 01',
        originating_component_id: 'CMS',
        originator_reference_id: '1234567',
        requester_id: '1234567',
      },
    },
  },
};
