Feature: InterventionEvents.feature

    @regression
    Scenario: Database record inserted when intervention sent
        Given I send an intervention to the TxMA ingress SQS queue
        When I fetch the intervention events from the database table
        Then I expect to find an ACTIVE record for the intervention
