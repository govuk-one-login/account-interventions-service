#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-account-interventions-dev-admin

export AWS_ACCOUNT=$AWS_ACCOUNT

./provisioner.sh $AWS_ACCOUNT github-identity github-identity v1.1.1 || exit 1
./provisioner.sh $AWS_ACCOUNT aws-signer signer v1.0.8 || exit 1
./provisioner.sh $AWS_ACCOUNT container-signer container-signer v1.1.2 || exit 1

./provisioner.sh $AWS_ACCOUNT lambda-audit-hook lambda-audit-hook LATEST || exit 1
./provisioner.sh $AWS_ACCOUNT infra-audit-hook infrastructure-audit-hook LATEST || exit 1

./provisioner.sh $AWS_ACCOUNT api-gateway-logs api-gateway-logs v1.0.5 || exit 1
./provisioner.sh $AWS_ACCOUNT alerting-integration alerting-integration v1.0.6 || exit 1
./provisioner.sh $AWS_ACCOUNT certificate-expiry certificate-expiry v1.1.1 || exit 1
./provisioner.sh $AWS_ACCOUNT ecr-image-scan-findings-logger ecr-image-scan-findings-logger v1.2.0 || exit 1

./provisioner.sh $AWS_ACCOUNT vpc vpc v2.6.0 || exit 1
