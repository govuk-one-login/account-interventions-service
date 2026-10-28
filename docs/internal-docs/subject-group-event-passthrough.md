# Subject group event passthrough

## Introduction

This guide explains the changes needed to pass subject group data through from an inbound `TICF_ACCOUNT_INTERVENTION` event through to the associated outbound `AIS_EVENT_TRANSITION_APPLIED` event.

## What the data looks like

Both event definitions ([TICF_ACCOUNT_INTERVENTION](https://event-catalogue.internal.account.gov.uk/events/TICF_ACCOUNT_INTERVENTION/), [AIS_EVENT_TRANSITION_APPLIED](https://event-catalogue.internal.account.gov.uk/events/AIS_EVENT_TRANSITION_APPLIED/)) now include a `subject_groups` block inside their `extensions` object:

```json
"subject_groups": [
  {
    "count_type": "estimate",
    "provider_id": "account.gov.uk",
    "unique_account_count": 800,
    "uri": "urn:fdc:account.gov.uk:2022:78e6b045-0bda-4818-80b2-579d2bd2292e"
  },
  {
    "count_type": "estimate",
    "provider_id": "account.gov.uk",
    "unique_account_count": 200,
    "uri": "urn:fdc:account.gov.uk:2022:72sVlB2nsNU7mcLZYhYw-8e6b045-0bda-4818"
  }
]
```

The service doesn't need to store, interpret, or transform this data.

## Background

The egress event is built in [`src/services/send-audit-events.ts`](../../src/services/send-audit-events.ts).
The `sendAuditEvent` function assembles a `TxMAEgressEvent` and delegates the `extensions` object to the `buildExtensions` helper.

`buildExtensions` already passes TICF-specific data through by spreading the ingress `intervention` object onto the egress extensions, but only when the trigger event is `TICF_ACCOUNT_INTERVENTION`:

```ts
...(txMAIngressEvent.event_name === TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION &&
  txMAIngressEvent.extensions.intervention),
```

We should follow the same pattern for the `subject_groups` data - read it from the ingress event's `extensions` and spread/assign it onto the egress `extensions` under the same `TICF_ACCOUNT_INTERVENTION` check.

## Changes needed

### Ingress schema

The inbound event is validated and typed by the Zod schema in [`src/contracts/intervention-events.ts`](../../src/contracts/intervention-events.ts).
`ticfAccountInterventionSchema` defines the shape of `extensions` so if `subject_groups` is not declared there, it will get stripped before it reaches `buildExtensions`.
The field should probably be `optional()` so events sent before the field was introduced are still valid.

### Egress data

`buildExtensions` in [`src/services/send-audit-events.ts`](../../src/services/send-audit-events.ts) copies the value onto the egress extensions.
Both branches of the function (the branch with `stateEngineOutput` and the fallback branch) build an `extensions` object, so we need a new element in the branches that apply to `AIS_EVENT_TRANSITION_APPLIED`:

```ts
...(txMAIngressEvent.event_name === TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION &&
  txMAIngressEvent.extensions.subject_groups && {
    subject_groups: txMAIngressEvent.extensions.subject_groups,
  }),
```

We check the key exists and only add it when present, rather than emitting `subject_groups: undefined`.

### 3. Egress type

The egress extensions are typed by the interfaces in [`src/events/ais-event-ignored-stale.ts`](../../src/events/ais-event-ignored-stale.ts) (`AisEventIgnoredStaleExtensions` / `AisEventIgnoredStaleBasicExtensions`) and by the catalogue-generated `AIS_EVENT_TRANSITION_APPLIED` type referenced from [`src/data-types/interfaces.ts`](../../src/data-types/interfaces.ts).
The `subject_groups` field must exist on the relevant egress type for the assignment in step 2 to type-check, which should be the catalogue-generated types (this might require updating the catalogue npm package).
If that doesn't work we'll probably have to extend the local interface to match.

## Summary of the flow

```
TICF_ACCOUNT_INTERVENTION (ingress)
  └─ extensions.subject_groups
        │  validated/typed by intervention-events.ts (Zod)
        ▼
  processInterventions → sendAuditEvent → buildExtensions
        │  spreads subject_groups onto egress extensions
        ▼
AIS_EVENT_TRANSITION_APPLIED (egress)
  └─ extensions.subject_groups
```

## Testing

Unit tests for the egress build live in [`src/services/test/send-audit-events.test.ts`](../../src/services/test/send-audit-events.test.ts).
We probably need a new case that provides `subject_groups` on a `TICF_ACCOUNT_INTERVENTION` ingress event and asserts the same array appears on the emitted `AIS_EVENT_TRANSITION_APPLIED` extensions.
