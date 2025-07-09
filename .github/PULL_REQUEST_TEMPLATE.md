## Proposed changes
<!-- Include the Jira ticket number in square brackets as prefix, eg `FPAD-XXXX: Description of Change` -->

### What changed
<!-- Describe the changes in detail - the "what"-->

### Why did it change
<!-- Describe the reason these changes were made - the "why" -->

### Issue tracking
<!-- List any related Jira tickets or GitHub issues -->
<!-- List any related ADRs or RFCs -->
<!-- List any related PRs -->
- [FPAD-XXXX](https://govukverify.atlassian.net/browse/FPAD-XXXX)

## Testing
<!-- Please give an overview of how the changes were tested -->
<!-- Please specify if changes were tested locally and how, include evidence where relevant -->
<!-- Please specify if changes were deployed and tested in the AWS Account and how, include evidence where relevant -->

## Checklists
- [ ] Did not commit any not-required changes to the `src/infra/**/samconfig.toml`
- [ ] Tested changes and included test evidence in the PR, if appropriate
- [ ] Included all required tags and other properties for any new resources in the SAM template
- [ ] Ensured that any new resources in the SAM Template follow appropriate naming conventions
- [ ] Ensured that naming of new resources is compatible with deploying multiple stacks with custom stack names during development
- [ ] Ensured that no log lines include PII or other sensitive data
- [ ] Implemented unit testing for any new logic implemented, if appropriate
- [ ] Ensured that all commits in this PR are signed
- [ ] Ensured appropriate code coverage is maintained by unit tests
- [ ] Checked SonarCube and ensured no code smells were added
