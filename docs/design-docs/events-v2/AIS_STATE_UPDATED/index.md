# AIS_STATE_UPDATED

```mermaid
flowchart TB
    subgraph Producer
      AIS[Account Interventions Service]
    end
    AIS --> AIS_STATE_UPDATED[AIS_STATE_UPDATED]
    AIS_STATE_UPDATED --> TICF_CRI
    subgraph Consumers
      TICF_CRI[TICF CRI]
    end
```

[Original event](https://event-catalogue.internal.account.gov.uk/events/AIS_EVENT_TRANSITION_APPLIED/)

[JSON Schema](./schema.json)

[Example](./example.json)

## Questions

Do we need to include something like `allowable_interventions` or is this obvious or communicated another way?
