# Incident 001: Lambda retries

**Date:** 2026-06-18

## Summary

The intervention processor lambda was throwing an error at the very end of its execution because of a malformed DynamoDB query.
Because the error was at the end of the execution this led to many retries of tasks which had already been successfully carried out.
These retries were idempotent so the impact was limited.
The remediation was to revert the change, but this failed because the canary deployments were listening for the alarm that was still going off and rolled back the reverted version.
The remediation for the deployment failing was to increase the thresholds on the alarm to stop it firing, then revert the increase after the deployment succeeded.

### Things that went well

- An alert fired!
- No fundamental missing test capability

### Things that went poorly

- We have a missing test case (no feature test for the final output of the lambda)
- We can't diagnose things without escalated access or VPN access, and we can't gain escalated access without using TEAM which requires 2 team members to be online.
    - It wasn't obvious that the VPN not being on was blocking the ability to diagnose the issue
- It was unclear how severe the problem was, and who was responsible for it being resolved
- The alarm only went off when an event came in
- The alarm was hard to turn off

### Where we got lucky

- The issue wasn't a P1

## Actions
- Ed to create some docs around incidents.
- Developers to come up with a response approach to non-critical alarms in the next engineering catchup - something like a doc with:
    - Our responsibilities if a non-critical alarm is going off.
    - Principles like using IaC for changes where possible.
    - Practical things like probably get on the vpc.
    - "Hacks" like using alarm thresholds for unblocking canaries.

# Timeline

[2026-06-09]
[19:27] An alarm goes off
[2026-06-10]
[The morning] Edward and Kirsty fix the issue
