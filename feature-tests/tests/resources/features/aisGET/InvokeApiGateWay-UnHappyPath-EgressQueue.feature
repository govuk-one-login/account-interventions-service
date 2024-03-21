Feature: Invoke-APIGateway-EgressQueue-UnHappyPath.feature

    @regression @test
    Scenario Outline: UnHappy Path - Check Egress Queue Error messages for Ignored event - Returns Expected data for <invalidAisEventType>
        Given I send an valid <aisEventType> intervention event message to the TxMA ingress SQS queue
        When I invoke an API to retrieve the intervention status of the account
        And I send an other <secondAisEventType> intervention with past time stamp to the TxMA ingress SQS queue
        Then I expect the Egress Queue response with <eventName>
        Examples:
            | aisEventType    | secondAisEventType          | eventName               |
            | suspendNoAction | blockEventWithPastTimeStamp | AIS_EVENT_IGNORED_STALE |


    @regression @test
    Scenario Outline: UnHappy Path - Check Egress Queue Error messages for Deleted User - Returns Expected data for <invalidAisEventType>
        Given I send an valid <aisEventType> intervention event to the TxMA ingress SQS queue
        When I send a message with userId to the Delete SNS Topic
        And I invoke an API to retrieve the deleted intervention status of the user account
        And I send an valid <aisEventType> intervention event to the TxMA ingress SQS queue for the deleted user
        Then I expect response with valid deleted marker fields <eventName> for the userId in the Egrees Queue
        Examples:
            | aisEventType    | eventName                         |
            | suspendNoAction | AIS_EVENT_IGNORED_ACCOUNT_DELETED |


    @failingRegression
    ###- Due to egress retreies on this scenario, we need to implement in a different way
    Scenario Outline: UnHappy Path - Check Egress Queue Error messages for future time stamp - Returns Expected data for <invalidAisEventType>
        Given I send an invalid <eventType> intervention with future time stamp event message to the TxMA ingress SQS queue
        When I invoke an API to retrieve the intervention status of the account
        Then I expect Egress Queue response with <eventName>
        Examples:
            | eventType                         | eventName                   |
            | suspendedEventWithFutureTimeStamp | AIS_EVENT_IGNORED_IN_FUTURE |
