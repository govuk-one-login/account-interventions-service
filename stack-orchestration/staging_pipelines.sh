#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-id-reuse-core-staging-admin

export AWS_ACCOUNT=$AWS_ACCOUNT
#
./provisioner.sh $AWS_ACCOUNT ais-core-pipeline sam-deploy-pipeline v2.39.3 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-main-pipeline sam-deploy-pipeline v2.39.3 || exit 1
./provisioner.sh $AWS_ACCOUNT ais-alarm-pipeline sam-deploy-pipeline v2.39.3 || exit 1
