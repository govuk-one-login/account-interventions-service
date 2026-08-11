Feature: Intervention History UI

    Scenario: User with a suspension shows history on the details page
        Given a user has a "suspendNoAction" intervention on their account
        When I search for the user on the frontend
        Then I should see the intervention history
        And the history should show intervention state "Active"
    