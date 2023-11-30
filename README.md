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