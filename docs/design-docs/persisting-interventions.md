# Persisting Interventions

Author: Ed Evans (ed.evans@digital.cabinet-office.gov.uk)
Published: 2026-05

## Introduction

AIS currently maintains account state in a single DynamoDB record per user (the `AccountStatusTable`).
That record is a mutable snapshot of account state: when a new intervention arrives, the previous state is overwritten.
Each account has a JSON object storing the states it's moved through and some data about the relevant interventions, but no data about the states of the interventions themselvesn
Without a more complete intervention history we cannot:

- Support multiple interventions simultaneously on a single account without having `~O(n^2)` specific states for `n` interventions.
- Add new interventions without adding `n` new states as above, and having a model for how that new intervention is applied.
- Report on intervention volumes, durations, and outcomes across the estate.
- Support event-driven consumers — if AIS ever does need to act as a smart event bus, downstream services need a reliable ordered log of interventions to subscribe to.
- Record if an intervention was removed due to it being `superseded`, `mitigated`, or `removed`.

This document proposes persisting interventions in a new DynamoDB table, written by the existing `InterventionsProcessorFunction` at the point a state transition is successfully applied.

## Assumptions

- Interventions are independent between accounts

---

## Functional Requirements

### Data Model

Each persisted item represents a single intervention event that was successfully applied to an account.
Items are immutable once written.

Two approaches are presented below.
Both use DynamoDB and could coexist, but the choice of approach affects the table schema, the write logic, and how consumers query the data.

#### General concerns

##### Co-mingling data in the table

Every case we discuss in this document involves using account ID as the partition key, and the current account status table also uses account ID as a partition key.
This means a natural option is to store all rows in the same table and tag them so we know what the difference is.
Consequences of this co-mingling approach compared with an approach using multiple tables are:

- We don't need to create or maintain another table and the access to that table
- We need to tag rows so we know what kind of object they represent
- We need to handle existing rows which aren't tagged
- We need to use the existing sort key on the account status table to do queries on interventions
- We need to add logic to the application to handle the different kinds of rows and tags
- We wouldn't be trivially able to throw all the intervention rows away and start again

Based on these consequences, using a co-mingling approach would necessitate extra complexity in the application and the table itself while saving the cost of creating a new table.
It also removes our ability to trivially throw away the intervention rows while the table is write-only, which may be a useful step while iterating on the table specification.
Setting up a new DynamoDB table is cheap and fairly simple, and we have existing infrastructure-as-code that we can use by analogy.
Because of this, we're choosing a multiple table approach for this problem, and **not** using a co-mingling approach.

---

#### Option A: One mutable row per-intervention

Each row records the state of one intervention at the point it was applied.
This row is updates as an intervention moves through the state lifecycle.

##### Table: `InterventionStatus`

| Attribute                | DynamoDB Type | Key Role      | Notes |
|--------------------------|---------------|---------------|-------|
| `accountId`              | String        | Partition key | The user's subject identifier (`user_id` from the ingress event). Matches `pk` in `AccountStatusTable`. |
| `createdAt`              | Number        | Sort key      | Unix timestamp in **milliseconds** at which AIS wrote this record. Enables chronological ordering within a partition and supports range queries (e.g. "all interventions for account X since time T"). |
| `interventionId`         | String        | —             | A generated UUIDv4. Provides a stable, globally unique identifier for this intervention record that can be referenced in audit trails, support tickets, and downstream systems without exposing the `accountId`. |
| `interventionCode`       | String        | —             | The numeric code from `Codes` enum (e.g. `"01"`, `"02"`). Preserved verbatim from the ingress event. |
| `interventionName`       | String        | —             | The resolved `AISInterventionTypes` enum value (e.g. `AIS_ACCOUNT_SUSPENDED`). Denormalised here so consumers do not need to join against config. |
| `interventionReason`     | String        | —             | Free-text reason from `extensions.intervention.intervention_reason` in the ingress event. |
| `interventionState`      | String        | —             | The current state of the intervention: `created`, `applied`, `superseded`, `mitigated`, or `removed`. |
| `sentAt`                 | Number        | —             | Unix timestamp in milliseconds from `event_timestamp_ms` (or `timestamp * 1000`). When the originating system sent the event. |
| `componentId`            | String        | —             | `component_id` from the ingress event. The system that emitted the TxMA event. |
| `originatingComponentId` | String        | —             | `extensions.intervention.originating_component_id`. Optional — not all events carry it. Test fixtures consistently show `component_id: 'TICF_CRI'` paired with `originating_component_id: 'CMS'`, confirming the two fields are not redundant. Both are preserved verbatim; the precise semantic distinction is owned by the upstream systems. |
| `requesterId`            | String        | —             | `extensions.intervention.requester_id`. The identity of the human or system that requested the intervention - omitted for automated interventions. |
| `originatorReferenceId`  | String        | —             | `extensions.intervention.originator_reference_id`. The reference ID in the originating system. |
| `ttl`                    | Number        | —             | Unix timestamp in **seconds** at which DynamoDB should expire this item. Set to `createdAt / 1000 + retentionSeconds`. Retention period should match the programme's data retention policy (currently 2 years / 63,072,000 seconds, consistent with `DELETED_ACCOUNT_RETENTION_SECONDS`). |

##### Why `accountId` as partition key?
The dominant access pattern is "give me all interventions for this account".
A partition key of `accountId` makes that a single `Query` call with no scan.
Secondary access patterns (e.g. reporting across all accounts) should be served by an export pipeline, not by querying this table directly.

##### Why `createdAt` (write time) as sort key?
`createdAt` is set by AIS at write time and is always increasing within a partition, giving a reliable ordering of_when AIS processed each intervention.
`sentAt` is controlled by the upstream system and is not guaranteed to be monotonically increasing.
Events can arrive out of order or be replayed, in which case AIS might already have taken action before the "first" of two events arrives.
This means for ordering purposes we should rely on when AIS receives an event, which most of the time will provide the same ordering as `sentAt`
`sentAt` is preserved as a separate attribute for audit purposes.

---

#### Option B: Multiple immutable events per-intervention (event sourcing)

Rather than storing one row per intervention, this approach stores one row per event that happens to an intervention.
The current state of any intervention is derived by replaying all events for a given `accountId` in order.
No rows are ever updated or deleted (except by TTL expiry).

An intervention moves through a state machine:

```
created → applied → superseded
                  → mitigated
                  → removed
```

`applied` is a distinct state from `created` because application of an intervention may be asynchronous — the intervention can be recorded as `created` before AIS has confirmed it has taken effect.
If application is synchronous, `created` and `applied` can be collapsed into a single event, but the state is included here to keep the model open.

Each row in the event log represents one transition in that state machine for one intervention.

##### Table: `InterventionEvents`

| Attribute                    | DynamoDB Type | Key Role                              | Notes |
|------------------------------|---------------|---------------------------------------|-------|
| `eventId`                    | String        | -                                     | A generated UUIDv4 uniquely identifying this event. |
| `accountId`                  | String        | Partition key                         | The user's subject identifier. All events for a given user share this partition key. |
| `interventionId`             | String        | Sort key component (B-1)              | A generated UUIDv4 assigned when the intervention is first created. Shared across all events for the same intervention, allowing all events for a single intervention to be grouped. |
| `occurredAt`                 | Number        | Sort key component (B-2)              | Unix timestamp in milliseconds at which this event was written by AIS. |
| `interventionState`          | String        | —                                     | The state this event transitions the intervention into: `created`, `applied`, `superseded`, `mitigated`, or `removed`. |
| `interventionCode`           | String        | —                                     | From the `Codes` enum. Present on `created` events; may be omitted on subsequent events. |
| `interventionName`           | String        | —                                     | Resolved `AISInterventionTypes` value. Present on `created` events. |
| `interventionReason`         | String        | —                                     | Free-text reason. Present on `created` events. |
| `sentAt`                     | Number        | —                                     | Unix timestamp in milliseconds from the ingress event. |
| `componentId`                | String        | —                                     | `component_id` from the ingress event. |
| `originatingComponentId`     | String        | —                                     | Optional. `extensions.intervention.originating_component_id`. |
| `requesterId`                | String        | —                                     | Optional. `extensions.intervention.requester_id`. |
| `originatorReferenceId`      | String        | —                                     | Optional. `extensions.intervention.originator_reference_id`. |
| `ttl`                        | Number        | —                                     | Unix timestamp in seconds for DynamoDB TTL expiry. |

##### Sort key options

There are two reasonable choices for the sort key, with different tradeoffs:

##### Option B-1: `interventionId#occurredAt` (composite sort key)

Sort key is a string of the form `<interventionId>#<occurredAt>`.
This groups all events for the same intervention together within a partition and orders them chronologically within that group.
To reconstruct the full history of a single intervention, query with a `begins_with` condition on the sort key.
To reconstruct the full account history, query the entire partition and group by `interventionId` in application code.

Tradeoff: querying all events for an account in strict time order requires a full partition scan followed by a client-side sort, since events for different interventions are interleaved by `interventionId` prefix rather than by time.

##### Option B-2: `occurredAt` (timestamp sort key)

Sort key is the millisecond timestamp at which AIS wrote the event.
This gives a single chronological stream of all events for an account, which is the natural shape for building up account state by replaying events in order.
To reconstruct the state of a specific intervention, query the full partition and filter by `interventionId` in application code.
An individual account should never have many events, and reading all rows in a given partition is fast in DynamoDB, so it's unlikely performance will become an issue.

---

### Infrastructure

In either case we need a new DynamoDB table called `InterventionStatus`, consistent with the existing `AccountStatusTable`.
See [Appendix I](#appendix-i---dynamodb-cloudformation-yaml) for suggested `yaml`.

A dedicated KMS key (`InterventionStatusTableEncryptionKey`) with the same key policy pattern as `AccountStatusTableEncryptionKey` must be created alongside the table.
The table ARN and encryption key ARN must be exported as CloudFormation outputs so the `ais-main` stack can import them.
`InterventionsProcessorFunctionManagedPolicy` must be extended with `dynamodb:PutItem` on the new table ARN and `kms:Decrypt` / `kms:GenerateDataKey` on the new table's KMS key.
No other Lambda roles require access to this table — it is write-only from the application's perspective.

The option exists of using a dedicated queue and Lambda to decouple the write from the main processing path.
This is probably unnecessary:

- `InterventionsProcessorFunction` already performs a `dynamodb:UpdateItem` on `AccountStatusTable` synchronously in the hot path. Adding a second `dynamodb:PutItem` is the same class of operation with the same latency profile. It's difficult to find solid numbers for send latency on SQS but it's unlikely to be a critical difference.
- If the write fails, the existing retry mechanism (SQS `ReportBatchItemFailures`) will re-drive the message, so the history record will eventually be written when the state transition is retried.

It may be worth considering using [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transactions.html) to avoid the case where we only write successfully to either the account table or the interventions table.
Some quick googling implies this has performance impacts.
An alternative is making the writes idempotent - this requires a read for every write so is probably not feasible.

---

### Interfaces

We aim to have all persisted data strictly parsed at write time.
Because this data is entirely under our control (i.e. it's not part of the event catalogue and the schema isn't consumed by other components of DI) we can do this using Zod.
We should consider taking the opportunity to refactor how we communicate with DynamoDB to be re-usable and more in line with a ports-and-adapters approach, for increased flexibility and testability.

Because of DynamoDB's lack of schema enforcement and the possibility of the data schema needing to evolve over time, we should consider versioning each row in the table and storing that version in the row itself.
This allows us to parse based on version at write-time and read-time, and easily alter handling between versions and handle deprecation scenarios etc.

---

## Non-Functional Requirements

### Security

We can use similar security semantics to those relating to `AccountStatusTable`:

##### Encryption at rest
The new DynamoDB table uses a customer-managed KMS key (CMK), consistent with `AccountStatusTable`, with automatic key rotation enabled.
The key policy restricts `kms:Encrypt` / `kms:Decrypt` to the DynamoDB service principal scoped to the table ARN, and to the account root for key administration.

##### Encryption in transit
All DynamoDB API calls are made over TLS.
The existing `DynamoDBClient` configuration (used in `DynamoDatabaseService`) enforces this by default via the AWS SDK.

##### Least-privilege IAM
The `InterventionsProcessorFunction` role must be granted only `dynamodb:PutItem` on the history table.
No Lambda role should be granted `dynamodb:Query`, `dynamodb:Scan`, or `dynamodb:GetItem` on this table — it is write-only from the application.
Read access for audit and reporting purposes must be granted separately to dedicated roles outside the application stack.

##### Data classification
`accountId` is a sensitive identifier.
Log statements that include `accountId` must be prefixed with `LOGS_PREFIX_SENSITIVE_INFO` (consistent with existing practice) and filtered from CSLS subscription filters.

### Resilience

##### Point-in-time recovery (PITR)
Must be enabled.
PITR provides a continuous backup with a 35-day recovery window at no additional operational overhead.
This is already enabled on `AccountStatusTable` and must be consistent here.

##### DeletionProtection
Must be enabled in all non-dev environments, consistent with `AccountStatusTable`.

##### TTL-based expiry
Items expire automatically via DynamoDB TTL.
This is a soft delete — DynamoDB removes expired items asynchronously within 48 hours.
The application must not rely on TTL for hard deletion guarantees; if regulatory requirements demand hard deletion within a specific window, a separate cleanup process is needed.

##### Write failure handling
A failed `PutItem` causes the SQS record to be returned as a `batchItemFailure`.
The message is retried up to `maxReceiveCount` (currently 60) times before being sent to the DLQ.
The DLQ alarm (`InterventionsProcessorErrorsCanary`) will fire if errors persist.
This is the same resilience model as the existing state write and requires no additional infrastructure.

##### No single point of failure
DynamoDB is a managed, multi-AZ service.
There is no additional availability concern introduced by this change.

### Performance and Scalability

##### Latency budget
`InterventionsProcessorFunction` has a 5-second timeout.
The existing processing path includes one `Query` and one `UpdateItem` against `AccountStatusTable`.
Adding one `PutItem` against the history table adds approximately 2–5 ms at p99 (same-region DynamoDB).
This is well within the timeout budget.

##### Throughput
`PAY_PER_REQUEST` billing mode means DynamoDB scales write capacity automatically.
There are no pre-provisioned WCUs to manage or throttle against.
At current intervention volumes this is the correct choice; if volumes grow to the point where on-demand pricing becomes expensive, provisioned capacity with auto-scaling can be adopted without a schema change.

##### Lambda concurrency
The history write is synchronous and adds no concurrency pressure beyond what the existing writes already impose.
No reserved concurrency changes are required.

##### No hot partitions
`accountId` as partition key distributes writes across partitions naturally, assuming interventions are spread across many accounts.
A single account receiving a burst of interventions would hit the same partition, but DynamoDB's adaptive capacity handles this transparently.

### Observability

##### Metrics
We should record a counter for writes to the new table(s) which records successes and errors so we can see throughput and error rate.
We should consider recording the status and intervention type within the metric labels as well to make it easy to get basic metrics for the service.

We should log thrown errors, so we can debug them - these must contain no PII.

### Testability

##### Ports-and-adapters pattern
The persistence interface decouples the handler from the DynamoDB implementation.
Unit tests can then inject a fake implementation.

##### Integration tests
The existing feature tests in `feature-tests/` use a real DynamoDB table.
The relevant infrastructure will be deployed identically across environments making the feature test behaviour identical.

##### Mutation testing
The new service is in scope for Stryker.
The `persistIntervention` method and its callers should achieve the same mutation score threshold as the rest of the codebase.

## Appendices

### Appendix i - DynamoDB Cloudformation yaml

```yaml
InterventionHistoryTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub '${AWS::StackName}-intervention-status'
    AttributeDefinitions:
      - AttributeName: accountId
        AttributeType: S
      - AttributeName: createdAt
        AttributeType: N
    KeySchema:
      - AttributeName: accountId
        KeyType: HASH
      - AttributeName: createdAt
        KeyType: RANGE
    BillingMode: PAY_PER_REQUEST
    SSESpecification:
      KMSMasterKeyId: !Ref InterventionStatusTableEncryptionKey
      SSEEnabled: true
      SSEType: KMS
    DeletionProtectionEnabled: !If [IsDevEnvironment, false, true]
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: true
    TimeToLiveSpecification:
      AttributeName: ttl
      Enabled: true
    Tags:
      - Key: BackupFrequency
        Value: Bihourly
      # ... standard programme tags
```

### Appendix ii - Typescript interfaces

#### Option A interfaces

##### TypeScript type: `InterventionHistoryRecord`

```typescript
export type InterventionHistoryRecord {
  accountId: string;
  createdAt: number;           // ms epoch, set by AIS at write time
  interventionId: string;      // UUIDv4
  interventionCode: string;    // Codes enum value
  interventionName: string;    // AISInterventionTypes enum value
  interventionReason: string;
  interventionState: string;   // created | applied | superseded | mitigated | removed
  sentAt: number;              // ms epoch from ingress event
  componentId: string;
  originatingComponentId?: string;
  requesterId?: string;
  originatorReferenceId?: string;
  ttl: number;                 // seconds epoch
}
```

##### Service interface

```typescript
export interface InterventionStatusService {
  persistIntervention(record: InterventionHistoryRecord): Promise<void>;
}
```

#### Option B interfaces

##### TypeScript type: `InterventionEvent`

```typescript
export type InterventionEvent {
  eventId: string;             // UUIDv4, unique per event
  accountId: string;
  interventionId: string;      // UUIDv4, shared across all events for the same intervention
  occurredAt: number;          // ms epoch, set by AIS at write time
  interventionState: string;   // created | applied | superseded | mitigated | removed
  interventionCode?: string;   // Codes enum value — present on created events
  interventionName?: string;   // AISInterventionTypes enum value — present on created events
  interventionReason?: string; // present on created events
  sentAt: number;              // ms epoch from ingress event
  componentId: string;
  originatingComponentId?: string;
  requesterId?: string;
  originatorReferenceId?: string;
  ttl: number;                 // seconds epoch
}
```

##### Service interface

```typescript
export interface InterventionEventService {
  appendEvent(event: InterventionEvent): Promise<void>;
}
```
