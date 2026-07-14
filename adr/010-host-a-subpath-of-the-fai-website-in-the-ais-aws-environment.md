# Host a subpath of the FAI website in the AIS AWS environment

## What

Deploy a frontend hosted within the Account Interventions Service (AIS) AWS accounts.
This will sit behind an API Gateway in the AIS account, with the Fraud Admin Interface (FAI) forwarding a subpath `/interventions` to the AIS API Gateway and frontend.

FAI will handle authentication and pass through a verifiable JWT with authorisation data (see [notes](#authorisation-and-authentication) for more detail).

Specific cookies will be entirely isolated to either the existing FAI site or the AIS site.
All cookies used by the AIS site will be prefixed `ais_` to allow this.
The exception is the auth JWT, if it's encoded in a cookie (as opposed to a header).

![Architecture](./images/adr-010-architecture.png 'Architecture')

## Why

1. This decouples the two development teams, two different pipelines to production, two different GitHub repositories.
1. The AIS frontend can have access to different resources to FAI, including the AIS Status API, which isn't accessible over the internet.

## Consequences

1. We will need to support an additional Lambda.
1. Authentication may be complicated, particularly if we need RBAC. FAI uses a custom authoriser.
1. We may have to adapt to changes to the FAI authoriser over time.

## Notes

### Authorisation and authentication

We have the following requirements for auth:

- Users will authorise using the existing FAI authoriser.
- FAI must pass a token with the request to the AIS site.
- This token must be verifiable - the AIS site must be able to prove it came from FAI.
- This token must contain authorisation data about what the user is allowed to do.

We'll add functionality to the authoriser to create a JWT containing a claim about the user's authorisation.
The JWT will be signed with an asymmetric KMS key.
The KMS key's public key will be shared with the AIS frontend Lambda via the `GetPublicKey` operation (see [AWS docs](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html)).
The JWT will be attached to every request using a cookie or a header and the AIS frontend Lambda will use the shared public key to verify it.

### Discounted Options

#### Both teams developing on FAI

1. Fraud Team Mercury currently have a slow release cadence, which wouldn't allow the rapid iteration we are looking for.
1. If one team breaks the pipeline it would block both teams from releasing.
1. The FAI frontend lambda would need access to further resources without a seperation of concerns and this would be managed by Team Mercury.

#### Express App

This would match FAI.
However we would lose the benefits of Fastify.
It doesn't seem that likely that we would want to combine the apps in the future.
