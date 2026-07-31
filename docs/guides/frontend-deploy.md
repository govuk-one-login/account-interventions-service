# Frontend Deploy Guide

## Custom stack

When deploying a custom stack that is going to be accessed directly, rather than through FAI, it is possible to disable JWT authorisation and deploy a Public API Gateway.

The Public API Gateway is only accessible when the VPN is turned on.

### 1. Build the frontend

```bash
npm run ui:build
```

### 2. Deploy

```bash
aws login
```

```bash
sam deploy --config-env frontend --guided
```

Choose the following options:

| Option        | Value          |
| ------------- | -------------- |
| StagePrefix   | v1             |
| Subpath       | _empty string_ |
| DisableAuth   | true           |
| EnableGateway | true           |

### 3. View URL

In the AWS console, select the CloudFormation stack and look in Outputs to find the URL.

## Frontend CloudFormation Parameters

| Option        | Default / Dev,Build etc. |
| ------------- | ------------------------ |
| StagePrefix   | _empty string_           |
| Subpath       | /interventions           |
| DisableAuth   | false                    |
| EnableGateway | false                    |
