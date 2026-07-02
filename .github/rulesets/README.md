# Rulesets

This directory contains JSON rulesets for the `account-interventions-service` Github repo.
For convenience there is some duplication with the Github docs in this file.
For more on rulesets see the [ruleset docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets) and the [rule API spec](https://docs.github.com/en/rest/repos/rules?apiVersion=2026-03-10).

## Managing rulesets

All rulesets on the repo should be defined in JSON here, except those set externally (e.g. security rules like `shai-hulud npm worm prevention`).
We manage rulesets using the Github API - to use the API you'll need a Github fine-grained personal access token (PAT) with the following permissions on the `govuk-one-login/account-interventions-service` repo:

- Read access to metadata
- Read and Write access to administration

All HTTP calls below are represented using `curl` for convenience, and values that need to be filled in are wrapped in double curly braces: `{{ }}`.

### Workflow

To update or create a ruleset you should:

1. Update or create the JSON for the ruleset
1. Commit to a branch and open a PR in Github
1. Merge to `main` after approval as usual
1. Optionally, if you're updating a ruleset retrieve the ruleset from Github before making any changes
1. Use the API calls detailed below to make the change
1. Optionally, if you retrieved the ruleset before, retrieve it again and diff the two JSON objects
1. Alternatively, use the Github UI to inspect the ruleset and see your changes

### Retrieving a ruleset

```
curl -L \
-H "Accept: application/vnd.github+json" \
-H "Authorization: Bearer {{ Github PAT }}" \
-H "X-GitHub-Api-Version: 2026-03-10" \
https://api.github.com/repos/govuk-one-login/account-interventions-service/rulesets/{{ ruleset ID }}
```

### Updating a ruleset

```
curl -L \
-X PUT \
-H "Accept: application/vnd.github+json" \
-H "Authorization: Bearer {{ Github PAT }}" \
-H "X-GitHub-Api-Version: 2026-03-10" \
https://api.github.com/repos/govuk-one-login/account-interventions-service/rulesets/{{ ruleset ID }} \
-d @.github/rulesets/{{ ruleset file name }}
```

### Create a ruleset

```
curl -L \
-X PUT \
-H "Accept: application/vnd.github+json" \
-H "Authorization: Bearer {{ Github PAT }}" \
-H "X-GitHub-Api-Version: 2026-03-10" \
https://api.github.com/repos/govuk-one-login/account-interventions-service/rulesets/ \
-d @.github/rulesets/{{ ruleset file name }}
```
