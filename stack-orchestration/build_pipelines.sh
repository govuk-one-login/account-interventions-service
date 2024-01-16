#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-id-reuse-core-build-admin

export AWS_ACCOUNT=$AWS_ACCOUNT

./provisioner.sh $AWS_ACCOUNT ais-core-pipeline sam-deploy-pipeline v2.44.0 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-main-pipeline sam-deploy-pipeline v2.44.0 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-alarm-pipeline sam-deploy-pipeline v2.44.0 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-test-ecr test-image-repository v1.1.5 || exit 1
