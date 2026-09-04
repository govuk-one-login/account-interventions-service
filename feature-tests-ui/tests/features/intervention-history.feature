Feature: Intervention History UI

    Scenario: User account with an automated intervention shows history on the details page
        Given a user has a "automatedSuspendNoAction" intervention on their account
        When I search for the user via the UI
        Then I should see the intervention history for the correct user
        And the history should show that the intervention was "AUTOMATED"

    Scenario: An invalid URN being submitted shows no history available on the details page
        Given an invalid urn of "not-valid" is used to search via the UI
        Then I should see "No history available for this account." displayed for this account

    Scenario: A valid URN being submitted shows no history available on the details page
        Given I search for a user with a valid URN via the UI
        Then I should see "No history available for this account." displayed for this account

    Scenario: A valid empty form being submitted shows an error on the index page
      Given I search for a user without adding any URN
      Then I should see "Enter a valid subject identifier." displayed on the index page
