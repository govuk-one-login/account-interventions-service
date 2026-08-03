# Incident 003: Config errors when persisting intervention events

**Date:** 2026-07-28

## Summary

The interventions processor was using the `maxRetentionSeconds` config value to set retention on inactive intervention events in the DynamoDB database.
This config value wasn't set on the Lambda, so this operation always failed and wrote a logline with level `ERROR`.
This was at the end of the Lambda's execution flow so no other operations were affected.
The issue was fixed by using the correct config value that the Lambda does have set, `historyRetentionSeconds`.

## Learnings

### What went well

- The issue was creating a log line and incrementing a metric
- The errors were caught in such a way that the execution of the rest of the Lambda wasn't affected
- The fix was easy
- Little or no user impact

### What went poorly

- The config wasn't set up in a way where the compiler would catch this issue
- We had two config values with similar names
- We didn't have this covered by feature tests and the unit tests were wrong in the same way as the code
- We didn't get alerted about the metrics
- It took a long time (~3 weeks) to notice the issue
- Rows were written to the database without TTLs when they should have TTLs

### Where we got lucky

- Someone noticed the issue at all

## Actions

- Pass statically typed config objects into Lambdas, so the compiler can catch these errors.
- Use a statically typed config object passed down from the entrypoint everywhere, and get rid of all ad-hoc environment variable reads.
- Deal with the incorrectly written rows by deleting all data from the table.
- Observability improvements
    - Add a metric "leaderboard" to the main dashboard, which shows all metrics as a ranked list based on the count over a certain time period.
    - Add a count of `ERROR` level log lines in Cloudwatch.
    - Add an alert for this metric.

## Timeline

A timeline of the events important to the incident.
All times are be in UTC unless otherwise stated.
The example below demonstrates one way of formatting it.
Note the backslashes are necessary on the ends of some lines to create a non-paragraph linebreak.

#### [2026-06-29]
The bug gets merged to `main`.

#### [2026-07-22]
The bug is accidentally discovered while looking at logs.
