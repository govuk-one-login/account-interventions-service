Feature: Invoke-MultipleUsers-HappyPath.feature

    @test
    Scenario Outline: Happy Path - create multiple users - Returns Expected Data for <aisEventType>
        Given I invoke an API to retrieve the <aisEventType> status to the <numberOfusers> accounts. With history <historyValue>
        And I update the Id reset flag to TRUE
        When I Invoke an API to view the records
        Then the expected response <interventionType> is returned for the requested number of users
        Examples:
            | aisEventType    | numberOfusers | historyValue | interventionType      |
            | suspendNoAction | 25            | false        | AIS_ACCOUNT_SUSPENDED |