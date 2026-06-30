# @govuk-one-login/ais-status-sdk

TypeScript SDK for the [Account Interventions Service](https://github.com/govuk-one-login/account-interventions-service) Status API (v2).

## Installation

```sh
npm install @govuk-one-login/ais-status-sdk
```

### Requirements

Node.js ≥ 20 (uses native `fetch`).

[Zod](https://zod.dev/) library ≥ 4.0.0 (peer dependency).

## Usage

```ts
import { AisClient } from '@govuk-one-login/ais-status-sdk';

const client = new AisClient({ baseUrl: 'https://your-ais-endpoint.example.com' });

const status = await client.getAccountStatus('urn:fdc:gov.uk:2022:user123');
// { interventions: [{ name: 'RESET_PASSWORD' }] }
```

## API

### `new AisClient(config)`

| Option    | Type     | Required | Description                  |
| --------- | -------- | -------- | ---------------------------- |
| `baseUrl` | `string` | ✓        | Base URL of the AIS endpoint |

### `client.getAccountStatus(userId)`

Retrieve the intervention status for the account associated with the provided userId.

Throws if the response status is not 2xx or if the response does not match the expected shape.

## Building

```sh
npm run build
```

## Testing

```sh
npm test
```

## Stub

A stub is available for testing purposes at [src/stub.ts](src/stub.ts).
