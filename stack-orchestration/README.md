# Stack Orchestration Tool

A tool to programmatically create and update Cloudformation stacks in AWS.

The stack orchestration tool allows you to do the following from the command line:
* Create a changeset for a Cloudformation stack
* Update a Cloudformation stack using the created changeset
* Create a stack if the stack hasn't already been created

## Technology:

* Bash scripts
* AWS CLI management of Cloudformation stacks
* GDS CLI for authentication OR AWS SSO
* The stack orchestration tool is currently only supported on macOs

## Instructions - how to use the script
Create AWS profiles per AWS Account with the following convention:
`<aws-account-name>-admin`

For example, for an AWS account called `di-account-interventions-staging` account,
create a profile called `di-account-interventions-staging-admin`
as the profile's name needs to match the folder name to acquire the appropriate parameter files for the appropriate stack.

### Required parameters
1. AWS_ACCOUNT - `di-account-interventions-<env>-admin`
2. STACK_NAME - `ais-main-pipeline`
3. STACK_TEMPLATE - `sam-deploy-pipeline`
4. TEMPLATE_VERSION - `v1.10.0`

### Optional parameters:

The TEMPLATE_BUCKET defaults to:

```
https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/
```

This can be overwritten by specifying a template bucket as an environment variable:

```
TEMPLATE_BUCKET=example-bucket-name
```

You can opt to automatically approve change-set updates on existing stacks by setting environment variable `AUTO_APPLY_CHANGESET` to true

```
AUTO_APPLY_CHANGESET=true
```

### Template parameters

The template parameters for provisioning a stack are stored in a `parameters.json` file.

The following is an example directory structure to store the parameters.json files:

```
├── configuration
│   ├── di-account-interventions-dev-admin
│   │   ├── ais-core-pipeline
│   │   │   └── parameters.json
│   │   └── ais-main-pipeline
│   │       └── parameters.json
│   └── di-account-interventions-build-admin
│       ├── ais-core-pipeline
│       │   └── parameters.json
│       └── ais-main-pipeline
│           └── parameters.json
```

### Execute

To run the script please use the following command:

```
$ ./provisioner.sh {AWS_ACCOUNT} {STACK_NAME} {STACK_TEMPLATE} {TEMPLATE_VERSION}
```

Example:
```
./provisioner.sh di-account-interventions-dev-admin ais-core-pipeline sam-deploy-pipeline v2.5.0
```
