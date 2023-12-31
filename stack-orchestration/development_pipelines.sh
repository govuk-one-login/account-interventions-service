#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-id-reuse-core-dev-admin

export AWS_ACCOUNT=$AWS_ACCOUNT

./provisioner.sh $AWS_ACCOUNT ais-core-pipeline sam-deploy-pipeline v2.37.6 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-main-pipeline sam-deploy-pipeline v2.37.7 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-alarm-pipeline sam-deploy-pipeline v2.38.3 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-test-pipeline sam-deploy-pipeline v2.41.4 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-test-ecr test-image-repository v1.1.5 || exit 1
