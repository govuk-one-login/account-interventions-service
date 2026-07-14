# Incident 000: Report template

This is a template for incident reports, based on recommendations from the [Google SRE Book](https://sre.google/workbook/postmortem-culture/); refer to it for more detail on the sections below.
This document and the wider incident response process should be blame-free and focus on processes and systems and not people.

**Date:** yyyy-mm-dd

## Summary

A quick summary of the incident; what went wrong, its impact, and how it was remediated.

## Learnings

These sections are bullet point lists to help generate actions.

### What went well

### What went poorly

### Where we got lucky

## Actions

The actions are the most important outcome of the incident process.
They should drive the improvement of the team's processes and practices.
All actions should be assigned to someone, as in the examples below.

- Alice to automate the server reboot process.
- Bob to fix the bug that brought the server down.

## Timeline

A timeline of the events important to the incident.
All times are be in UTC unless otherwise stated.
The example below demonstrates one way of formatting it.
Note the backslashes are necessary on the ends of some lines to create a non-paragraph linebreak.

#### [2026-05-10]
[23:46] Alice gets paged because the server has gone down \
[23:52] Alice finds the root cause

#### [2026-05-11] 
[00:11] Alice brings the server back up
