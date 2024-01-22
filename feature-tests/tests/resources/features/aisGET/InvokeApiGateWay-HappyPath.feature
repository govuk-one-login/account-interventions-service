Feature: Invoke-APIGateway-HappyPath.feature

    @regression
    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the response with all the valid state flags for <aisEventType>
        Examples:
            | aisEventType              | historyValue | interventionType                                   | blockedState | suspendedState | resetPassword | reproveIdentity |
            | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | unblock                   | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | userActionIdResetSuccess  | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | userActionPswResetSuccess | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | unSuspendAction           | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
  
    @regression
    Scenario Outline: Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue for a Account in <originalAisEventType> state
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the response with all the valid state fields for the <aisEventType> and <originalAisEventType>
        Examples:
            | originalAisEventType  | aisEventType              | historyValue |
            # passsword reset account status to new intervention type
            | pswResetRequired      | pswResetRequired          | false        |
            | pswResetRequired      | suspendNoAction           | false        |
            | pswResetRequired      | block                     | false        |
            | pswResetRequired      | idResetRequired           | false        |
            | pswResetRequired      | pswAndIdResetRequired     | false        |
            | pswResetRequired      | unblock                   | false        |
            | pswResetRequired      | userActionIdResetSuccess  | false        |
           #| pswResetRequired      | userActionPswResetSuccess | false        |
            | pswResetRequired      | unSuspendAction           | false        |
            # suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired          | false        |
            | suspendNoAction       | suspendNoAction           | false        |
            | suspendNoAction       | block                     | false        |
            | suspendNoAction       | idResetRequired           | false        |
            | suspendNoAction       | pswAndIdResetRequired     | false        |
            | suspendNoAction       | unblock                   | false        |
            | suspendNoAction       | userActionIdResetSuccess  | false        |
            | suspendNoAction       | userActionPswResetSuccess | false        |
            | suspendNoAction       | unSuspendAction           | false        |
            # blocked account status to new intervention type
            | block                 | pswResetRequired          | false        |
            | block                 | suspendNoAction           | false        |
            | block                 | block                     | false        |
            | block                 | idResetRequired           | false        |
            | block                 | pswAndIdResetRequired     | false        |
            | block                 | unblock                   | false        |
            | block                 | userActionIdResetSuccess  | false        |
            | block                 | userActionPswResetSuccess | false        |
            | block                 | unSuspendAction           | false        |
            # Id reset account status to new intervention type
            | idResetRequired       | pswResetRequired          | false        |
            | idResetRequired       | suspendNoAction           | false        |
            | idResetRequired       | block                     | false        |
            | idResetRequired       | idResetRequired           | false        |
            | idResetRequired       | pswAndIdResetRequired     | false        |
            | idResetRequired       | unblock                   | false        |
           #| idResetRequired       | userActionIdResetSuccess  | false        |
           #| idResetRequired       | userActionPswResetSuccess | false        |
            | idResetRequired       | unSuspendAction           | false        |
            # password reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired          | false        |
            | pswAndIdResetRequired | suspendNoAction           | false        |
            | pswAndIdResetRequired | block                     | false        |
            | pswAndIdResetRequired | idResetRequired           | false        |
            | pswAndIdResetRequired | pswAndIdResetRequired     | false        |
            | pswAndIdResetRequired | unblock                   | false        |
           #| pswAndIdResetRequired | userActionIdResetSuccess  | false        |
           #| pswAndIdResetRequired | userActionPswResetSuccess | false        |
            | pswAndIdResetRequired | unSuspendAction           | false        |

    @regression
    Scenario Outline: Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with History values
        Given I send an updated request to the SQS queue with intervention data of the type <aisEventType> from <originalAisEventType>
        When I invoke the API to retrieve the intervention status of the user's account with <historyValue>
        Then I expect the response with history values for the <aisEventType>
        Examples:
            | originalAisEventType  | aisEventType          | historyValue |
            # passsword reset account status to new intervention type
            | pswResetRequired      | suspendNoAction       | true         |
            | pswResetRequired      | block                 | true         |
            | pswResetRequired      | idResetRequired       | true         |
            | pswResetRequired      | pswAndIdResetRequired | true         |
            | pswResetRequired      | unSuspendAction       | true         |
            # suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired      | true         |
            | suspendNoAction       | block                 | true         |
            | suspendNoAction       | idResetRequired       | true         |
            | suspendNoAction       | pswAndIdResetRequired | true         |
            | suspendNoAction       | unSuspendAction       | true         |
            # blocked account status to new intervention type
            | block                 | unblock               | true         |
            # Id reset account status to new intervention type
            | idResetRequired       | pswResetRequired      | true         |
            | idResetRequired       | suspendNoAction       | true         |
            | idResetRequired       | block                 | true         |
            | idResetRequired       | pswAndIdResetRequired | true         |
            | idResetRequired       | unSuspendAction       | true         |
            # password reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired      | true         |
            | pswAndIdResetRequired | suspendNoAction       | true         |
            | pswAndIdResetRequired | block                 | true         |
            | pswAndIdResetRequired | idResetRequired       | true         |
            | pswAndIdResetRequired | unSuspendAction       | true         |

    @smoke
    Scenario Outline: Happy Path - Field Validation - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with specific field validation
        Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
        When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint
        Examples:
            | aisEventType    | historyValue | interventionType    | testUserId |
            | suspendNoAction | false        | AIS_NO_INTERVENTION |            |

    @regression
    Scenario: Happy Path - Field Validation - Get Request to /ais/userId -  Multiple Transitions from one event type to other event types
        Given I send a multiple requests to sqs queue to transit from one event type to other event types with single userId
        When I invoke apiGateway to retreive the status of the valid userId with history as true
        Then I should receive every transition event history data in the response for the ais endpoint
