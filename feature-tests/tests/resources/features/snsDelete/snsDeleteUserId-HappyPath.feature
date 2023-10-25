Feature: SNS-UserId-Delete-HappyPath.feature

    Background: Set up and obtain authorization values for Delete requests
        Given I created a valid userId
        Given I obtained an api key
        Given I obtained an authorization token

    Scenario Outline: Happy Path - Send SNS Delete Topic - Data Integrity Check - Confirms VC data for a UserID has been deleted successfully

        Given I prepopulate the database with valid VCs for the userId
        When I send a valid GET request to the vcs endpoint
        Then the returned data should be the same as original data

        Given I send a message for a UserId to the Delete SNS Topic
        And I receive a metadata with <deleteHttpStatusCode>
        When I send a valid GET request to the vcs endpoint
        Then I should receive a <statusCode> with no data found <response>
        Examples:
            | deleteHttpStatusCode | statusCode | response      |
            | 200                  | 404        | no data found |

    Scenario Outline: Happy Path - Send SNS Delete Topic to delete 100vcs - Data Integrity Check - Confirms VC data for a UserID has been deleted successfully
        Given I prepopulate the database with 100 VCs for the userId
        Given I send a message for a UserId to the Delete SNS Topic
        And I receive a metadata with <deleteHttpStatusCode>
        When I send a GET request to the vcs endpoint
        Then I should receive a <statusCode> with no data found <response>
        Examples:
            | deleteHttpStatusCode | statusCode | response      |
            | 200                  | 404        | no data found |
