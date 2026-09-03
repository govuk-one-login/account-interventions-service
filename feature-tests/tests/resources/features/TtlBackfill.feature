Feature: TTL backfill lambda

    @regression
    Scenario: Backfills intervention-events rows that are missing a TTL
        Given two intervention-events rows exist in the seeded window with no TTL
        When I invoke the TTL backfill lambda over a window bracketing those rows
        Then the report is complete and reports at least two rows updated
        And each of those rows now has the backfilled TTL tagged as BACKFILL

    @regression
    Scenario: Leaves rows that already have a TTL untouched
        Given an intervention-events row exists in the seeded window with an existing TTL
        When I invoke the TTL backfill lambda over a window covering that row
        Then that row's TTL is unchanged and it is not tagged as BACKFILL

    @regression
    Scenario: Ignores rows outside the createdAt window
        Given an intervention-events row exists with no TTL outside the invocation window
        When I invoke the TTL backfill lambda over a window that excludes that row
        Then that row still has no TTL
