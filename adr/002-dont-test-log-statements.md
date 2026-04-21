# Don't test the content of log lines

## What

We will not test the content of log lines in automated tests.
Calls to logger functions will not be counted in coverage, and will not be mutated during mutation testing.
The only exception is if the main purpose of the system under test (SUT) is logging.
An example of this is a function which dynamically logs different data depending on the input.

## Why

Logging is a perfect candidate for testing in production.
It's a non-functional part of the code for which we (team Neptune) are a first-class user.
This means we should be closely involved in the use of logs, and able to address any issues with logging.

Adding and changing log lines should be also be made as easy as possible to encourage engineers to rely on observability instead of other things (e.g. manually checking data in production cloud environments).

This decision introduces no additional risk of logging PII because one can easily write a test for a log line which logs PII.

## Consequences

- Test coverage becomes easier to understand.
- Tests are more focused on functional behaviour.
- Log lines are untested so need to be checked with care at development-time and review-time, and in use.

## Notes

---
