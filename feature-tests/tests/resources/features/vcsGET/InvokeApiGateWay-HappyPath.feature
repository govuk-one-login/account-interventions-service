Feature: VCS-UserId-GET-HappyPath.feature

    @test
    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Data for a userId
        Given I send a request to sqs queue with <aisType> data
        When I invoke apiGateway to retreive the status of the userId with <history>
        Then I should receive the appropriate <statusCode> and <response> for the ais endpoint
        Examples:
            | aisType         | history      |  | statusCode |
            | suspendNoAction | true         |  | 200        |