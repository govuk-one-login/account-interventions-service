# DI Accounts - VC Storage Tests - JEST Supertest API Test Framework
Jest is a JavaScript Testing Framework with a focus on simplicity, which can also be used with TypeScript.
Supertest allows for HTTP assertions.

#### The purpose of this project is automate API functionality of the VC Storage Solution. The framework configurations can be found in jest-cucumber-config.js file in the feature-tests folder of the project.

## This project uses:
- Cucumber-Jest
- Supertest
- Typescript
- cucumber reporting
- yarn
- docker

## Command to run tests

Set up the following env vars.
```shell
cd feature-tests
yarn install && yarn build
export TEST_ENVIRONMENT=dev
export SAM_STACK_NAME=id-reuse-storage-main
export AWS_REGION=eu-west-2
export AWS_PROFILE=dev
```

Then sign-in into AWS account.
```shell
aws sso login --profile $AWS_PROFILE
```

To run all API tests locally in Jest via Jest.
```shell
yarn test
```

To run all API tests locally as the Test Container would do.
```shell
sh run-tests.sh
```

## Command to build and run in docker
Builds an image using assets in project then create a running instance of the image.

```shell
cd feature-tests
docker build -t di-id-reuse-storage-feature-tests-image .
```

once the docker image is built, run the following the execute the dockerfile
```shell
docker run di-id-reuse-storage-feature-tests-image:latest
```


## ESLint for Typescript
ES Lint has been configured for the typescript code within the framework

To check the ES Linting, run **lint:code** in the command line

run **lint:code:fix** to fix some issues found
