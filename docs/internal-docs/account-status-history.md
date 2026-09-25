# How History is stored in the account-status table

## Storage format
The history field stored in the account-status table in DynamoDB is an array of pipe-delimited strings. Each string represents an intervention event and has the following fields:
- event_timestamp_ms
- component_id
- intervention_code
- intervention_reason
- originating_component_id
- originator_reference_id
- requester_id

For example:

1695600000000|TICF_CRI|01|reason|CMS|12345|67890

Note that optional fields (originating_component_id, originator_reference_id, and requester_id) are stored as empty strings when absent.

## When history is appended
History strings are appended when a fraud intervention event is processed. In
`buildPartialUpdateAccountStateCommand()`, a new string is built via `HistoryStringBuilder.getHistoryString()` and
appended to the existing array.

This only happens for intervention events (e.g. suspend, block). User-initiated resolution events (password reset,
reprove identity) do not add new history strings - they only carry forward the existing valid entries. This can be seen in `buildPartialUpdateAccountStateCommand()` on lines 35 - 56, for the user initiated event types, `stringBuilder.getHistoryString(interventionEvent, eventTimestamp)` is never called, therefore no new history is added.

## How history is appended
The pattern for appending is as follows:
1. Read the existing item from DynamoDB (`getAccountStateInformation`) in the [interventions-processor](../../src/handlers/interventions-processor.ts)
1. Pass the existing history array (or an empty array if no history item exists) to `buildPartialUpdateAccountStateCommand` via `updateUserStatus` in [account-status](../../src/tables/account-status.ts)
1. Filter expired entries via (`extractValidHistoryItems`)
1. Append new history entries where applicable (only fraud intervention events have new history entries appended)
1. The entire history array is written via `this.recordService.update` being called from `updateUserStatus`

## When and how history is deleted
History entries are removed by filtering on every write - there is no scheduled cleanup job and no explicit delete operation for history strings in the account-status table.

The function `extractValidHistoryItems` in [build-partial-update-state-command](../../src/commons/build-partial-update-state-command.ts) runs every time any event is processed - this can be seen in the `buildPartialUpdateAccountStateCommand` function in the same file.

How `extractValidHistoryItems` works:
1. Iterates each pipe-delimited history string in the historyList
1. Parses the history string into an object
1. Gets the sentAtMs timestamp using the history object from the above step
1. Checks if the history item is still valid by checking `sendAtMs + AppConfigService.getInstance().historyRetentionSeconds * 1000 >= currentTimestampMs` i.e. the history item is within the retention period. Pushes valid items to a new array
1. Returns the new array containing only the entries that passed the above check

Note that historyRetentionSeconds is configured via the HISTORY_RETENTION_SECONDS variable in the [template.yaml](../../src/infra/main/template.yaml) and is currently set to 63,072,000 seconds (2 years)
