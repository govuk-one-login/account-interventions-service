#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-id-reuse-core-dev-admin

export AWS_ACCOUNT=$AWS_ACCOUNT

# ./provisioner.sh $AWS_ACCOUNT id-reuse-core-pipeline sam-deploy-pipeline v2.15.0 || exit 1

# ./provisioner.sh $AWS_ACCOUNT id-reuse-test-pipeline sam-deploy-pipeline v2.15.0 || exit 1
# ./provisioner.sh $AWS_ACCOUNT id-reuse-test-ecr test-image-repository v1.1.2 || exit 1

# ./provisioner.sh $AWS_ACCOUNT id-reuse-mock-pipeline sam-deploy-pipeline v2.15.0 || exit 1

# ./provisioner.sh $AWS_ACCOUNT id-reuse-main-pipeline sam-deploy-pipeline v2.24.2 || exit 1

# ./provisioner.sh $AWS_ACCOUNT id-reuse-alarm-pipeline sam-deploy-pipeline v2.31.2 || exit 1

# ./provisioner.sh $AWS_ACCOUNT ais-core-pipeline sam-deploy-pipeline v2.37.6 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-main-pipeline sam-deploy-pipeline v2.37.7 || exit 1