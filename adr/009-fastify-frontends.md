# Fastify Frontends

## What

Use the [Fastify](https://fastify.dev/) web framework for frontends.

Run Fastify on AWS Lambda.

## Why

Fastify on Lambda follows this Account [ADR-0002](https://github.com/govuk-one-login/account-components/blob/main/docs/adr/0002-application-architecture.md).

Offers async as standard.

## Consequences

- Won't be able to copy and paste code into the Fraud Admin Interface (FAI) as this runs on Express.
