#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-account-interventions-production-admin

export AWS_ACCOUNT=$AWS_ACCOUNT


./provisioner.sh $AWS_ACCOUNT checkov-hook checkov-hook LATEST || exit 1
./provisioner.sh $AWS_ACCOUNT lambda-audit-hook lambda-audit-hook LATEST || exit 1
./provisioner.sh $AWS_ACCOUNT infra-audit-hook infrastructure-audit-hook LATEST || exit 1

./provisioner.sh $AWS_ACCOUNT grafana-key-rotation grafana-key-rotation v1.0.7 || exit 1
./provisioner.sh $AWS_ACCOUNT grafana-metrics grafana-metrics v1.0.4 || exit 1

./provisioner.sh $AWS_ACCOUNT api-gateway-logs api-gateway-logs v1.0.4 || exit 1
./provisioner.sh $AWS_ACCOUNT build-notifications build-notifications v2.0.1 || exit 1
./provisioner.sh $AWS_ACCOUNT alerting-integration alerting-integration v1.0.5 || exit 1
./provisioner.sh $AWS_ACCOUNT certificate-expiry certificate-expiry v1.0.4 || exit 1

./provisioner.sh $AWS_ACCOUNT vpc vpc v2.1.0 || exit 1
