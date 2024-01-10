# Account Interventions Service
[![Build & Test](https://github.com/govuk-one-login/account-interventions-service/actions/workflows/acceptance-checks.yaml/badge.svg)](https://github.com/govuk-one-login/account-interventions-service/actions/workflows/acceptance-checks.yaml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=govuk-one-login_account-interventions-service&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=govuk-one-login_account-interventions-service)
[![Verify & Publish](https://github.com/govuk-one-login/account-interventions-service/actions/workflows/merge-main-to-main.yaml/badge.svg)](https://github.com/govuk-one-login/account-interventions-service/actions/workflows/merge-main-to-main.yaml)

## Introduction
A serverless typescript project for the Account Intervention Service solution.

## How To
### Prerequisites
- [Docker](https://docs.docker.com/engine/install/) >= v20.10
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html#install-sam-cli-instructions) >= 1.96.0

### Clone the repo
```shell
git clone git@github.com:govuk-one-login/account-interventions-service.git
cd account-interventions-service
```

### Setup Pre-Commit
```shell
$ pre-commit install -f
```

### Install Project Dependencies
``` bash
$ yarn install
```

### Build & Test Project
To fully test the application, try the test command below
``` bash
$ yarn build
$ yarn test
```

### Lints Code, SAM Template & Open API Spec
``` bash
$ yarn lint
```
- `yarn lint:code` - TypeScript is linted by [ESLint](.eslintrc.js)
- `yarn lint:iac` - SAM template is linted by [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/validate-cfn-lint.html)
- `yarn lint:spec:oas` - OpenAPI specification is linted by [Spectral](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/validate-cfn-lint.html)

#### Fix ES Lint Issues
```shell
$ yarn lint:code:fix
```

### Check For Vulnerable Dependencies
```shell
$ yarn audit
```
#### Fix Vulnerable Dependencies
```shell
$ yarn audit:fix
```

## Architecture Diagram
![img.png](img.png)

## How To Deploy Account Interventions Service into Production
### 1. Base CloudFormation Stacks
To deploy the base common cloudformation stacks required created by Dev Platform prior to deploying the solution use the Stack Orchestation tool provided in our `Stack-orchestration` directory under the folder `di-account-interventions-production-admin` and deploy the `production_bootstrap.sh` script which will have the following base stacks to be deployed into our `production` environment:

***The stacks to be deployed are:***
1. alerting-integration
2. api-gateway-logs
3. certificate-expiry
4. vpc
5. lambda-audit-hook
6. checkov-hook
7. infra-audit-hook

#### ⚡ Prior to deploying check the correct version is being deployed to the latest version via the CHANGELOG https://github.com/govuk-one-login/devplatform-deploy/tree/main

#### Steps:

```shell
$ cd stack-orchestation
$ aws configure sso
$ aws sso login --profile di-account-intervention-admin-324281879537
$ sh production_bootstrap.sh
```
The bootstrap script should then deploy all base Cloudformation stacks required for account set up.

### 2. Deploy ais-infra stacks

##### ⚠️ Make sure pre-commit has been enabled on the `ais-infra` repo
```shell
$ pre-commit install -f
```

### Stacks to deploy
1. `ais-infra-alerting`
- This stack sets up the Chatbot configuration for all Slack alerts relating to AIS.
  - When deploying set the parameter `InitialNotificationStack: no`
2. `ais-infra-common`
- This stack includes all the AWS Secrets used for Dynatrace.
  - Once deployed, head into the AWS console and manually update the secret for `DynatraceApiToken` and `DynatraceApiKey` to be replaced with the correct values provided by the ***Observability Team***.
3. `ais-dynatrace-metrics`
- This stack will enable custom metrics to be captured under the Account Interventions Service Namespace.
  - Do ensure that we have manually updated the Secret `DynatraceApiKey` to the provided value before deploying this stack.


> ℹ️ Detailed deployment instructions for these 3 stacks to be followed are available in their respective README's

### 3. Deploy the secure pipeline stacks

Use the Stack Orchestation tool provided in our `Stack-orchestration` directory under the folder `di-account-interventions-production-admin` and deploy the `production_bootstrap.sh` script which will have the following base stacks to be deployed into our `production` environment:

#### Deploy these 3 secure pipeline using the Stack Orchestration tool
1. `ais-core-pipeline` deploy our `ais-core` stack
2. `ais-main-pipeline` deploys our `ais-main` stack
3. `ais-alarm-pipeline` deploys our `ais-alarm` stack

---

#### ⚡ Prior to deploying update and make these checks:
- [ ] check the correct version of secure pipelines is being referencing in the `production_pipelines.sh` by checking the CHANGELOG and updating value -   https://github.com/govuk-one-login/devplatform-deploy/blob/main/sam-deploy-pipeline/CHANGELOG.md#added-32


- [ ] For all 3 pipelines under `di-id-reuse-core-staging-admin` update the ParameterKey  `AllowedAccounts` to also include our production account number.


- [ ] For all 3 pipelines under `di-account-interventions-production` check the ParameterKey `ArtifactSourceBucketArn` is set to the staging `ArtifactPromotionBucketArn` value found in the Outputs tab of the 3 pipeline stacks.


- [ ] For all 3 pipelines under `di-account-interventions-production` check that the ParameterKey `ArtifactSourceBucketEventTriggerRoleArn` is set to the staging `ArtifactPromotionBucketEventTriggerRoleArn` value found in the Outputs tab of the 3 pipeline stacks.


- [ ] For all 3 pipelines under  `di-account-interventions-production` check that the ParameterKey `BuildNotificationStackName` is `ais-infra-alerting`.


- [ ] For all 3 pipelines under  `di-account-interventions-production` check that the ParameterKey `SlackNotificationType` is set to `Failures`.

---

#### Deployment Steps:

After checks have been taken, deploy the 3 pipelines `ais-core-pipeline` , `ais-main-pipeline` and `ais-alarm-pipeline` to `production`.

```shell
$ cd stack-orchestation
$ aws configure sso
$ aws sso login --profile di-account-intervention-admin-324281879537
$ sh production_pipelines.sh
```

Once all 3 pipelines have been deployed to `production` procced to deploy the `staging_pipelines.sh` script to allow promotion up to the `production` account.

```shell
$ cd stack-orchestation
$ aws configure sso
$ aws sso login --profile di-id-reuse-core-staging-admin-922902741880
$ sh staging_pipelines.sh
```
This will allow the all 3 pipelines to deploy all the way to production??

## Additional Info

### Old SAM version
If you already have an earlier version of SAM installed you may need to either upgrade SAM or uninstall it
and reinstall it.
Here are some instructions you can follow to do this:
```shell
$ brew upgrade aws-sam-cli
```
[Managing AWS SAM CLI versions - AWS Serverless Application Model](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/manage-sam-cli-versions.html)

### Pre-commit

The command may be required if you do not already have pre-commit installed on your machine
```shell
$ brew install pre-commit
```

### Using nodenv
If you work across multiple Node.js projects there's a good chance they require different Node.js and npm versions.

To enable this we use [nodenv](https://github.com/nodenv/nodenv#readme) to switch between versions automatically.

1. Install and setup [nodenv](https://github.com/nodenv/nodenv#installation).
2. Install the NodeJS version used by this project `nodenv install <node-version>`.

```shell
$ brew install nodenv
$ nodenv init
$ cat .node-version | nodenv install
```

Getting latest releases of Node Version supported by nodenv (this may take a while)
```shell
brew upgrade nodenv node-build
```

### Webpack process
Webpack is configured to scan the SAM template file [template.yaml](./src/infra/main/template.yaml) looking for lambda function
declarations in order to find the handler files, i.e. the webpack entry files, to perform bundling on.

1. Looks for resource where `Type` = `AWS::Serverless::Function`).
2. Uses the function resource's `CodeUri` value as the folder where it will output the function's webpack'd code.
3. Uses the function resource's `Handler` value as the file to use as a webpack entry.
4. Per web pack entry, finds the function's handler file in the `src/handlers` folder.
5. Runs the webpack process and writes the bundle in to the `dist` folder in the locations expected by the SAM template.

### Testing the Private Api Gateway endpoint
The api in this application is a private api, which means testing it can't be done using tools like postman. The lambda `{stack-name}-InvokePrivateAPIGatewayFunction` has been created to allow the api to be tested. Since this lambda is created within the application's VPC, it meets the required security measures so it is able to successfully invoke the endpoint.

The api has the following format:
```
<baseurl>/ais/:userId?history=true
```
Note: the query string parameter (`history=true`) is optional.

This lambda sets default values for the baseUrl and the endpoint (e.g. `ais`) in the environment variables.

There are two ways to use this lambda:

### :calendar: Using the lambda event:
All of these keys are optional. Anything provided in the event will override the default value in the environment variable.
```
{
    "userId": "<theUserId>",
    "queryParameters": "history=true",
    "baseUrl": "<theBaseUrl eg http://hello-world.com>",
    "endpoint": "<theEndpoint eg /ais>",
    "headers": { 'Content-Type': 'application/json' } // add any headers here
}
```

### :seedling: Using the environment variables:
Update the values for these variables. Note, if you also provide the equivalent value in the lambda event, the lambda will use the lambda event values.
```
USER_ID
QUERY_PARAMETERS
BASE_URL
END_POINT
```

Note: that at the moment the lambda is not set up to work for a post request, so changes to the lambda will need to be made if post requests become a requirement.
