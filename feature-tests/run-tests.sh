#! /bin/bash
set -u

if test -f ".env"; then
 echo ".env exists."
else
  touch .env
  if [[ $TEST_ENVIRONMENT = "dev" ]]
  then
    echo X_API_KEY=$(aws secretsmanager get-secret-value --secret-id /$SAM_STACK_NAME/Config/API/Key/IPVCore --query "SecretString" --output text) > .env
  else
    echo X_API_KEY=$(aws secretsmanager get-secret-value --secret-id /id-reuse-storage-core/Config/API/Key/IPVCore --query "SecretString" --output text) > .env
  fi
fi

# in pipeline copy files to CODEBUILD_SRC_DIR where next to the .env file is created
cp /package.json . 2>/dev/null || :
cp /yarn.lock . 2>/dev/null || :
cp /tsconfig.json . 2>/dev/null || :
cp /jest.config.ts . 2>/dev/null || :
cp /jest-cucumber-config.js . 2>/dev/null || :
cp -R /tests ./tests 2>/dev/null || :
cp -R /apiEndpoints ./apiEndpoints 2>/dev/null || :
cp -R /node_modules ./node_modules 2>/dev/null || :
cp -R /utils ./utils 2>/dev/null || :

# run tests and save the exit code
declare test_run_result
yarn test 1>/dev/null
test_run_result=$?

# store report to dir where pipeline will export from
reportDir=${TEST_REPORT_ABSOLUTE_DIR:-./results}
cp -rf results/ "$reportDir" 2>/dev/null || :

# exit with the exit code return yarn test
# shellcheck disable=SC2086
exit $test_run_result
