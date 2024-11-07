#! /bin/bash

set -u

# in pipeline copy files to CODEBUILD_SRC_DIR where next to the .env file is created
cp /package.json . 2>/dev/null || :
cp /yarn.lock . 2>/dev/null || :
cp /tsconfig.json . 2>/dev/null || :
cp /jest.config.ts . 2>/dev/null || :
cp /jest-cucumber-config.js . 2>/dev/null || :
cp -R /tests . 2>/dev/null || :
cp -R /apiEndpoints . 2>/dev/null || :
cp -R /node_modules . 2>/dev/null || :
cp -R /utils . 2>/dev/null || :

# run tests and save the exit code
declare test_run_result
export tagFilter=@regression
echo 'Beginning Tests'
yarn test # 1>/dev/null
test_run_result=$?

# store report to dir where pipeline will export from
# reportDir=${TEST_REPORT_ABSOLUTE_DIR:-./results}
# cp -rf results/ "$reportDir" 2>/dev/null || :
# exit with the exit code return yarn test
# shellcheck disable=SC2086
exit $test_run_result
