# AIS Frontend Feature Tests
  
  Playwright BDD feature tests for the Account Interventions Service frontend UI.
  
  ## This project uses:
  
  - Playwright
  - playwright-bdd (Gherkin/Cucumber support)
  - TypeScript
  - npm
  
  ## Prerequisites
  
  - Node.js >= 24.14.0
  - VPN connection (required to access the dev frontend)
  - AWS SSO access to the dev account
  - A deployed frontend stack with `DisableAuth=true` and `EnableGateway=true`
    - Please refer to the [frontend deploy instructions](../docs/guides/frontend-deploy.md) for information on how to do this
  
  ### Running tests locally
  1. Run the following:
      ```shell
      cd feature-tests-ui
      npm install
      ```
  
  1. Set up environment variables in the .env file
      ```shell
      TEST_ENVIRONMENT=dev
      SAM_STACK_NAME=ais-main
      AWS_REGION=eu-west-2
      FRONTEND_URL=https://<api-id>.execute-api.eu-west-2.amazonaws.com/v1
      ```
  
  
  1. Sign in to AWS:
      ```shell
      aws sso login --profile <profile_name>
      ```
      or
      ```shell
      aws login
      ```
  1. Run the tests:
      ```shell
      npm test
      ```
