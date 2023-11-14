#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-account-interventions-integration-admin

export AWS_ACCOUNT=$AWS_ACCOUNT

./provisioner.sh $AWS_ACCOUNT ais-core-pipeline sam-deploy-pipeline v2.39.3 || exit 1

./provisioner.sh $AWS_ACCOUNT ais-main-pipeline sam-deploy-pipeline v2.39.3 || exit 1

./provisioner.sh $AWS_ACCOUNT ais-alarm-pipeline sam-deploy-pipeline v2.39.3 || exit 1

#./provisioner.sh $AWS_ACCOUNT id-reuse-test-pipeline sam-deploy-pipeline v2.15.0 || exit 1
#./provisioner.sh $AWS_ACCOUNT id-reuse-test-ecr test-image-repository v1.1.2 || exit 1

