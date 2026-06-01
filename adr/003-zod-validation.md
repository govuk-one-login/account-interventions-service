# Zod Validation

## What

Validate incoming messages from TxMA using the [Zod](https://zod.dev/) validation framework.
Where messages fail validation we will block further processing and add a metric, so we can track the occurance.

Limit validation to the properties that we require in our handlers.

We will add non-blocking validation based on the JSON schemas from the event catalogue.
When a message fails this validation we won't block further processing, but we will add a separate metric.

We will aim to keep the `Zod` validation as a subset of the event catalogue JSON schemas.
For now this will be manual and through unit testing with illustrative events, however long term we may aim to use a static tool.

## Why

It doesn't make sense to try and process messages which lack the required properties.

Our preference would be to validate purely using event catalogue JSON schemas, which are a governed and shared resource.
There is currently very limited upstream validation of the messages that we receive from TxMA.
Our testing shows that many of the events we receive do not meet the event catalogue definitions.
This means that we have low confidence that the messages we receive will always pass validation against the JSON schemas in the event catalogue.
By utilising our own `Zod` types we can be sure that data enterring our system fits a known shape and is processable.

## Consequences

- We will have control over our validation, independant of the event catalogue.
- We won't be rejecting large numbers of processable messages.
- We will get guaranteed type safety for all the data entering our system, based on automatically generated `Zod` types.
- We have to write our own `Zod` validation in addition to the event catalogue schemas.
- By processing events that don't confirm to the event catalogue schemas, we may reduce how quickly components are fixed to send the correct events.

## Alternatives

Switch to utilising event catalogue schemas, however this would lead to large numbers of processable events being rejected.
