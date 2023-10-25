Feature: SNS-UserId-Delete-NegativeCases.feature

    Background: Set up and obtain authorization values for Delete requests
        Given I created a valid userId
        Given I obtained an api key
        Given I obtained an authorization token

    Scenario Outline: Negative Case - Delete userId that doesnt exists - Data Integrity Check - Confirms VC data for a UserID has been deleted successfully
        Given I prepopulate the database with valid VCs for the userId
        Given I send an valid message to a non existing UserId to the Delete SNS Topic
        And I receive a metadata with <deleteHttpStatusCode>
        When I send a valid GET request to the vcs endpoint
        Then the returned data should be the same as original data
        Examples:
            | deleteHttpStatusCode |
            | 200                  |

    Scenario Outline: Negative Case - Send Invalid message to SNS Delete Topic - Data Integrity Check - Confirms VC data for a UserID has been deleted successfully
        Given I prepopulate the database with valid VCs for the userId
        And I send an invalid <messageKey> to the Delete SNS Topic
        When I send a valid GET request to the vcs endpoint
        Then the returned data should be the same as original data
        Examples:
            | messageKey |
            | usser_id   |
            | userId     |

    Scenario: Negative Case - Send Empty message to SNS Delete Topic - Data Integrity Check - Confirms VC data for a UserID has been deleted successfully
        Given I prepopulate the database with valid VCs for the userId
        And I send an empty message to the Delete SNS Topic
        When I send a valid GET request to the vcs endpoint
        Then the returned data should be the same as original data
