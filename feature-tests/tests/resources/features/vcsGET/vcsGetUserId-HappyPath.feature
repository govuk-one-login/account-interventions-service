Feature: VCS-UserId-GET-HappyPath.feature

    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Data for a userId
        Given I send a request to sqs queue with specific data
        When I send a GET request with <contentType> and <accept> to the GET ais endpoint
        Then I should receive the appropriate <statusCode> and <response> for the ais endpoint
        Examples:
            | contentType      | accept | statusCode |
            | application/json | */*    | 200        |
            | application/json | */*    | 200        |

  Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Data for a userId
        Given I send a request to sqs queue with specific data
        When I send a GET request with <contentType> and <accept> to the GET ais endpoint
        Then I should receive the appropriate <statusCode> and <response> for the ais endpoint
        Examples:
            | contentType      | accept | statusCode |
            | application/json | */*    | 200        |        