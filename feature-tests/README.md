# DI Accounts - VC Storage Tests - Vitest Supertest API Test Framework

Vitest is a JavaScript Testing Framework with a focus on simplicity, which can also be used with TypeScript.
Supertest allows for HTTP assertions.

#### The purpose of this project is automate API functionality of the VC Storage Solution.

## This project uses:

- Cucumber
- Vitest
- Supertest
- Typescript
- npm
- docker

## Command to run tests

Set up the following env vars.

```shell
cd feature-tests
npm install && npm run build
export TEST_ENVIRONMENT=dev
export SAM_STACK_NAME=ais-main
export AWS_REGION=eu-west-2
export AWS_PROFILE=dev
export tagFilter=@regression
```

Then sign-in into AWS account.

```shell
aws sso login --profile $AWS_PROFILE
```

To run all API tests locally in Vitest via Vitest.

```shell
npm test
```

To run all API tests locally as the Test Container would do.

```shell
sh run-tests.sh
```

## Command to build and run in docker

Builds an image using assets in project then create a running instance of the image.

```shell
cd feature-tests
docker build -t account-intervention-service-feature-tests-image .
```

once the docker image is built, run the following the execute the dockerfile

```shell
docker run account-intervention-service-feature-tests-image:latest
```

## Environment configuration

If new values are added to **endpoints.ts**, associated values will then need to be added to the main template

## ESLint for Typescript

ES Lint has been configured for the typescript code within the framework

To check the ES Linting, run **lint:code** in the command line

run **lint:code:fix** to fix some issues found
