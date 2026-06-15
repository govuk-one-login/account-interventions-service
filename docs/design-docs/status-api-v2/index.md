# Status API v2

Author: Edward Louth (edward.louth@digital.cabinet-office.gov.uk)

Published: 2026-05

## Introduction

The Account Interventions Service (AIS) currently provides a `v1` Status API, see [Swagger](https://symmetrical-adventure-q4wnm7e.pages.github.io/?urls.primaryName=account-interventions-service-api) or [api.yaml](../../src/specs/api.yaml).

The `v1` API indicates status using four boolean values, the current status doesn't map neatly onto these booleans, leading to consumers implementing their own logic. The aim is to create a more extensible design, making it easier to add additional interventions in the future.

## Decisions

### 1. Interface Design

1. New API endpoint at path `/v2/ais/{userId}`
1. No history available
1. List of all currently active interventions
1. Interventions as objects, so that in future additional metadata can be added
1. Intervention names from enum but typed to include string for forwards compatibility when adding new interventions
1. Accounts with one or more interventions applied to be prevented from accessing RPs, including future interventions. This logic to live in consumers' code or SDK.

[OpenAPI Schema](./api.yaml)

### 2. Security

We will follow the same security principles and posture as the current v1 API.

### 3. NFRs

The new API aim to meet the same NFRs as the current v1 API.

## Implementation Details

### 4. Existing Lambda or new Lambda

We will start developing the feature on the existing Lambda.

## Roll out

1. A new `v2` API will be designed and implemented.
1. Consumers will be encouraged to migrate to the new `v2` API.
1. The `v1` API will be deprecated and removed.
1. New interventions will only be added to the `v2` API.
