# FAI Walled Garden

## What

Deploy a frontend hosted within the Account Interventions Service (AIS) AWS accounts.

This will sit behind an API Gateway in the AIS account, with the Fraud Admin Interface (FAI) forwarding a subpath `/interventions` to the AIS API Gateway and frontend.

FAI will handle authentication and only pass on authorised users.

The AIS frontend will have seperate cookies from FAI.

![Architecture](./images/adr-010-architecture.png 'Architecture')

## Why

1. This decouples the two development teams, two different pipelines to production, two different GitHub repositories.
1. The AIS frontend can have access to different resources to FAI, including the AIS Status API, which isn't accessible over the internet.

## Consequences

1. We will need to support an additional Lambda.
1. Authentication may be complicated, particularly if we need RBAC. FAI uses a custom authoriser.
1. We may have to adapt to changes to the FAI authoriser over time.

## Notes

### Discounted Options

#### Both teams developing on FAI

1. Fraud Team Mercury currently have a slow release cadence, which wouldn't allow the rapid iteration we are looking for.
1. If one team breaks the pipeline it would block both teams from releasing.
1. The FAI frontend lambda would need access to further resources without a seperation of concerns and this would be managed by Team Mercury.

### Express App

This would match FAI.
However we would lose the benefits of Fastify.
It doesn't seem that likely that we would want to combine the apps in the future.
