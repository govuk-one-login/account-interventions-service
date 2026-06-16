# Integration testing strategy

## What

We will diverge slightly from the programme's [integration testing strategy](https://govukverify.atlassian.net/wiki/spaces/QE/pages/5268930598/Automated+Quality+Gates) as described in the quality gates documentation, while still fulfilling the broader requirements on quality.

We will not run any AWS resource-dependent integration tests before merging code to `main`.
In pre-merge CI we will only run automated unit and component tests, i.e. tests which don't depend on communicating with AWS resources.
After merging changes to `main` we will run feature tests in the `build` environment which depend on AWS resources.

We will validate data as it enters and leaves our systems using `Zod` or `ajv`.
We will enforce strict types on data at all system boundaries, e.g. inputs and outputs of Lambdas, reads and writes to DynamoDB.

## Why

The Account Interventions Service application runs in AWS and is strongly coupled to certain AWS resources.
For example, relevant events from TxMA are added to an SQS queue, consumed by a Lambda which runs application code, the output of which is an event in another SQS queue for consumption by more application code in a second Lambda.
Testing the integration of these components requires one of three approaches:

1. Running the integration tests in AWS using the actual cloud resources themselves.
2. Modelling the AWS resources on local hardware using stubs or something like [LocalStack](https://www.localstack.cloud/localstack-for-aws).
3. Robustly enforcing shared input and output types for the application code and relying on validation layers and a static type system.

For more discussion of these options, see [the Notes section](#notes).
A mixture of options 1 and 3 as described above offers the best balance of pre-merge simplicity and speed, and validation of the application before it gets to production.
This aligns fully with the Quality Gate principles:

1. **Fully Automated Validation:** The enforcement of types at system boundaries will automatically surface issues at compile time and in unit tests, while the post-merge AWS tests will automatically surface issues with AWS resource abstractions.
1. **Balance Delivery Pace and Quality:** Moving cloud-based integration tests post-merge supports faster pre-merge iteration loops without sacrificing quality. It also means less maintenance of CI pipelines meaning more time for delivery-focused work.
1. **Independence from Cross-Service Deployments:** This is unaffected by the approach described here.
1. **Monitor Bypasses of Mandatory Checks:** This is unaffected by the approach described here.
1. **Applicable for Every Change:** This is unaffected by the approach described here.
1. **Do not delay route to live:** Faster pre-merge checks means a quicker route to production in the first place, and the guardrails provided by the type system and validation of data at the system boundaries means less testing burden and quicker checks.

## Consequences

- We have strong guarantees about the data in the application.
- We have fewer stacks to maintain.
- We're more likely to find issues after merge and block the pipeline.
- We have to use a more manual approach to test infrastructure changes.

## Notes

### Option 1: Running integration tests in AWS

Running the integration tests in AWS is the most reliable option, as that's how the code runs in production.
However, doing this pre-merge has significant downsides.

The standard pattern for running AWS-based integration tests pre-merge is to create a cloudformation stack in the `dev` AWS environment for each pull request and run the tests on that stack.
The Github Actions workflows to provision and de-provision these stacks are not trivial and require developer time to create and maintain.
The stacks themselves are also prone to problems; for example, if the deletion of a given stack fails because of a network partition or other common issue, that stack will pollute the dev environment until it's manually deleted.
These stacks also cost money to run.

These tests are harder to read and write than those that run locally, and tend to be much larger in scope so many more tests are needed to cover the variability of multiple components.
They also take longer to run which lengthens test and review iteration loops and slows down the speed with which we can get work to production.

Additionally infrastructure tends to change much less often than code, so these tests will rarely expose issues that wouldn't be exposed with a complete test suite

### Option 2: Modelling AWS resources locally

This option mitigates the issues with managing AWS resources described above, but the other negatives of Option 1 remain.
Additionally the APIs of AWS resources change over time, so test doubles for AWS resources that we create are liable to mis-represent the related AWS resources and require work to maintain.
Using an external solution like LocalStack reduces this burden but often costs money and is still liable to issues matching the AWS APIs.

### Option 3: Enforcing integration through software design

This option doesn't directly test the integration of components, but instead enforces shared interfaces at their boundaries.
For example, if the output of one Lambda is fed into an SQS queue which feeds a second Lambda, the output type of the first Lambda handler must be the input type of the second (note the same type must be used, not just two types which are the same).
The data must be parsed and validated to enforce these types.
Where the data is coming from outside the system, we should provide shared types to both systems using an external source (e.g. the event catalogue) or providing a strict interface (e.g. an OpenAPI spec).

The benefits of this approach are basically the opposite of those for Option 1 - we can rely on a component-based test suite which is small and fast, we don't have to manage AWS resources in CI, and we don't unnecessarily test the code.
The primary downside of this approach is that we don't actually test the behaviour of the application as it is in production.
If in the example above the SQS queue were to change the shape of the payload which is sent to the second Lambda, this option would not surface the issue.
This means testing infrastructure changes requires a more manual approach; the best fit for this is probably a manually dispatched Github Workflow for deploying a branch to the `dev` stack along with an obligation to communicate this to the team.
It's also hard to verify in CI that the code is designed along these principles.
