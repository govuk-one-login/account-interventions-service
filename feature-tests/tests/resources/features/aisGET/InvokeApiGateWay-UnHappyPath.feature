Feature: Invoke-APIGateway-UnHappyPath.feature

    @regression
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Returns Expected data for <invalidAisEventType>
        Given I send invalid <invalidAisEventType> intervention message to the TxMA ingress SQS queue
        When I invoke the API to retrieve the intervention status of the account
        Then I expect response with no intervention <description>
        Examples:
            | invalidAisEventType                          | description         |
            | missingEventNameAndId                        | AIS_NO_INTERVENTION |
            | missingTimeStamps                            | AIS_NO_INTERVENTION |
            | missingExtensions                            | AIS_NO_INTERVENTION |
            | invalidInterventionCodeType                  | AIS_NO_INTERVENTION |
            | invalidInterventionCode                      | AIS_NO_INTERVENTION |
            | invalidInterventionCodeWithSpecialCharacters | AIS_NO_INTERVENTION |
            | invalidInterventionCodeWithBooleanValues     | AIS_NO_INTERVENTION |
            | invalidInterventionCodeWithSpace             | AIS_NO_INTERVENTION |
            | invalidInterventionCodeWithEmptyValues       | AIS_NO_INTERVENTION |


    @test
    Scenario Outline: UnHappy Path - Check Egress Queue Error messages - Returns Expected data for <invalidAisEventType>
        Given I send an invalid <invalidAisEventType> intervention event message to the TxMA ingress SQS queue
        When I invoke an API to retrieve the intervention status of the account
        Then I expect Egress Queue response with no intervention <description>
        Examples:
            | invalidAisEventType                          | description         |
            | missingEventNameAndId                        | AIS_NO_INTERVENTION |
            # | missingTimeStamps                            | AIS_NO_INTERVENTION |
            # | missingExtensions                            | AIS_NO_INTERVENTION |
            # | invalidInterventionCodeType                  | AIS_NO_INTERVENTION |
            # | invalidInterventionCode                      | AIS_NO_INTERVENTION |
            # | invalidInterventionCodeWithSpecialCharacters | AIS_NO_INTERVENTION |
            # | invalidInterventionCodeWithBooleanValues     | AIS_NO_INTERVENTION |
            # | invalidInterventionCodeWithSpace             | AIS_NO_INTERVENTION |
            # |invalidInterventionCodeWithEmptyValues        | AIS_NO_INTERVENTION |


    @regression
    Scenario Outline: UnHappy Path - Check Egress Queue Error messages for future time stamp - Returns Expected data for <invalidAisEventType>
        Given I send an invalid <eventType> intervention with future time stamp event message to the TxMA ingress SQS queue
        When I invoke an API to retrieve the intervention status of the account
        Then I expect Egress Queue response with <eventName>
        Examples:
            | eventType                         | eventName                   |
            | suspendedEventWithFutureTimeStamp | AIS_EVENT_IGNORED_IN_FUTURE |

    @regression
    Scenario Outline: UnHappy Path - Check Egress Queue Error messages for Ignored event - Returns Expected data for <invalidAisEventType>
        Given I send an valid <aisEventType> intervention event message to the TxMA ingress SQS queue
        When I invoke an API to retrieve the intervention status of the account
        And I send an other <secondAisEventType> intervention with past time stamp to the TxMA ingress SQS queue
        Then I expect the Egress Queue response with <eventName>
        Examples:
            | aisEventType    | secondAisEventType          | eventName               |
            | suspendNoAction | blockEventWithPastTimeStamp | AIS_EVENT_IGNORED_STALE |

    @regression
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Field Validation - Returns Expected Data for <aisEventType> with specific field validation
        Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
        When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint
        Examples:
            | aisEventType    | historyValue | interventionType    | testUserId |
            | suspendNoAction | false        | AIS_NO_INTERVENTION |            |


    @regression
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Invalid Base URL - Returns Expected Data for <aisEventType>
        Given I send a valid request to sqs queue with userId and <aisEventType>
        When I invoke apiGateway with invalid base url to retreive the status of the userId
        Then I should receive the response with <message> for the invalid base url
        Examples:
            | aisEventType    | message                      |
            | suspendNoAction | Missing Authentication Token |


    @regression
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Invalid Endpoint - Returns Expected Data for <aisEventType>
        Given I send a valid request to sqs queue with <aisEventType>
        When I invoke apiGateway with invalid endpoint to retreive the status of the userId
        Then I should receive response with <message> for the ais endpoint
        Examples:
            | aisEventType    | message                      |
            | suspendNoAction | Missing Authentication Token |

    @regression
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Invalid Content-Type & Accept - Returns Expected Data for <aisEventType>
        Given I send an valid request to sqs queue with <aisEventType>
        When I invoke apiGateway with invalid <contentType> and <accept> to retreive the status of the userId
        Then I should receive the response with <message>
        Examples:
            | aisEventType    | contentType      | accept | message                      |
            | suspendNoAction | text/html        | */*    | Missing Authentication Token |
            | suspendNoAction | application/json |        | Missing Authentication Token |
            | suspendNoAction |                  | */*    | Missing Authentication Token |

    @regression
    Scenario Outline: UnHappy Path - Get Request to /ais/userId - Mixed Case History values - Returns Expected Data for <aisEventType>
        Given I send an valid <aisEventType> request to sqs queue
        When I invoke apiGateway to retreive the status userId with <historyValue>
        Then I should receive the response with no history items for the ais endpoint
        Examples:
            | aisEventType    | historyValue |
            | suspendNoAction | FALSE        |
            | suspendNoAction | tRuE         |
            | suspendNoAction | TrueFalse    |
            | suspendNoAction | Truee        |
            | suspendNoAction | *&           |
            | suspendNoAction | TRUE         |
