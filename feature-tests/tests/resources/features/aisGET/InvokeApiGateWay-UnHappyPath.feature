Feature: Invoke-APIGateway-UnHappyPath.feature

    @regression @test
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Returns Expected data for <invalidAisEventType>
        Given I send invalid <invalidAisEventType> intervention message to the TxMA ingress SQS queue
        When I invoke the API to retrieve the intervention status of the account
        Then I expect response with no intervention <description>
        Examples:
            | invalidAisEventType       | description         |
            | missingEventNameAndId     | AIS_NO_INTERVENTION |
            | missingTimeStamps         | AIS_NO_INTERVENTION |
            | missingExtensions         | AIS_NO_INTERVENTION |

    @regression
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Field Validation - Returns Expected Data for <aisEventType> with specific field validation
        Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
        When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint
        Examples:
            | aisEventType    | historyValue | interventionType    | testUserId |
            | suspendNoAction | false        | AIS_NO_INTERVENTION |            | 


    @regression @test
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Invalid Base URL - Returns Expected Data for <aisEventType>
        Given I send a valid request to sqs queue with userId and <aisEventType> 
        When I invoke apiGateway with invalid base url to retreive the status of the userId
        Then I should receive the response for the ais endpoint
        Examples:
            | aisEventType    | 
            | suspendNoAction |


    @regression @test
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Invalid Path Parameters - Returns Expected Data for <aisEventType>
        Given I send a valid request to sqs queue with <aisEventType> 
        When I invoke apiGateway with invalid path parameters to retreive the status of the userId
        Then I should receive the response for the ais endpoint
        Examples:
            | aisEventType    | 
            | suspendNoAction |       
                                                                      