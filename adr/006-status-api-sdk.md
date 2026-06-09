# Status API SDK

## What

Provide a Typescript SDK for the Status v2 API.
We will publish this SDK to a package repository so that it can easily be consumed by other teams.

We won't provide a Java SDK due to lack of expertise in the team.
We will support another team if they want to create a Java SDK.

## Why

An SDK should make it easier for our API consumers to use our API.

An SDK should give us more control over how consumers call our API, including making future changes, for example adding information about the system calling our API.

## Consequences

- Teams will be able to choose between calling our API direct or using the SDK
- Our team will need to write and support the SDK
