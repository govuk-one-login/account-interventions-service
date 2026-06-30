# Include Zod as a peer dependency in the AIS status API v2 SDK

## What

We will include the Zod npm package as a peer dependency in the AIS status API Typescript SDK.

## Why

We've chosen to validate API inputs using Zod in [ADR 3](./003-zod-validation.md) and to publish a Typescript SDK for the Status API v2 in [ADR 6](./006-status-api-sdk.md).
One of the benefits of publishing an SDK is we can ship Typescript types which enforce its interface, giving users of the SDK compile-time assurance about the data in the API requests and responses.
We derive these exported types from the associated Zod parsers to enforce the interface at the implementation level, but Typescript requires the Zod npm package to take advantage of these.
This means we need to include Zod as a peer dependency in the npm package, as described in the [Zod docs](https://zod.dev/library-authors?id=how-to-configure-peer-dependencies#how-to-configure-peer-dependencies).

The upside of this is the assurance about the interface and the type convenience at the SDK level described above.
The downsides are the necessity of installing Zod if you want to use the SDK and you don't already use Zod.

However, Zod is already [widely used](https://github.com/search?q=org%3Agovuk-one-login%20zod&type=code) in Typescript projects in the One Login programme.
It's a [small package](https://bundlephobia.com/package/zod@4.4.3) with no dependencies, and is already included as a parser in [AWS Lambda Powertools](https://docs.aws.amazon.com/powertools/typescript/2.1.0/utilities/parser/), reducing the degree of the downsides such that this decision is a net positive.
In addition, if Typescript SDKs and interface enforcement using this pattern become more common, the downsides shrink further thanks to scale effects

## Consequences

- Calls from Typescript projects in the programme to the AIS status API using the SDK are automatically type-safe
- Any application that imports this SDK also needs to install Zod
- The blast radius of a supply chain issue with the Zod package becomes the union of all packages importing Zod and all packages importing the SDK
