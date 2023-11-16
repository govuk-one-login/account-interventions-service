Feature: Invoke-APIGateway-HappyPath.feature

    @test
    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Data for a userId
        Given I send a request to sqs queue with <aisType> data
        When I invoke apiGateway to retreive the status of the userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint
        Examples:
            | aisType          | historyValue |interventionType                |
            | pswResetRequired | true         |AIS_FORCED_USER_PASSWORD_RESET  |