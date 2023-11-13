Feature: VCS-UserId-GET-HappyPath.feature

    @test
    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Data for a userId
        Given I send a request to sqs queue with <aisType> data
        When I send a GET request with <contentType> and <accept> to the GET ais endpoint
        Then I should receive the appropriate <statusCode> and <response> for the ais endpoint
        Examples:
            | aisType         | contentType      | accept | statusCode |
            | suspendNoAction | application/json | */*    | 200        |