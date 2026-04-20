# Use architecture decision records (ADRs)

## What

We will use ADRs to record decisions about how the Account Interventions Service is designed and built.
ADRs will be written in markdown using the template stored at `adr/adr.md.template`,
and will be stored in the `/adr` directory, using the naming scheme `NNN-short-camel-case-description.md`.
New ADRs will be posted in the [Team Neptune slack channel](https://gds.slack.com/archives/C0AJ3VC50LU) and explicitly brought up in standup to allow engineers and architects to review.
A newer ADR overrides an older one; as far as possible, this should be explicitly referenced in the newer ADR.

## Why

We often have to make think through and commit to decisions in order to move forwards with software development.
Keeping a record of these decisions and their justifications means we can find what we agreed in the past and not do the same work twice.
We can consult these records in the future to gather context quickly and avoid doing the same thinking twice.
These decisions will also be visible and searchable by other teams, potentially saving them time.
[ADRs are used at the programme level](https://github.com/govuk-one-login/architecture/tree/main/adr).

## Consequences

- A list of technical decisions we made will be publicly visible.
- Engineers have to do the extra work to document decisions being made.
- The team will save time making (and re-making) decisions in future.

## Notes

I've tried to make this ADR template as simple as possible and no simpler; it's adapted from [this PR description framework](https://jml.io/posts/what-why-notes/) by Jonathan Lange.
The section headings are ordered by importance, with the intention that any reader can read from the top and get the information they need then get out.

I've avoided a metadata section with fields like `owner`, `reviewer`, and `date`, because we can use the repo's git history for this information.
The ADRs themselves are ordered by name for convenience, but the associated git commit provides time information as well as some record of who did the work on the ADR.
