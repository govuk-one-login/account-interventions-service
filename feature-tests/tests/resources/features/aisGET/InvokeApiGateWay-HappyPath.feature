Feature: Invoke-APIGateway-HappyPath.feature

    @regression
    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the response with all the valid state flags for <aisEventType>
        Examples:
            | aisEventType              | historyValue |
            | pswResetRequired          | false        |
            | suspendNoAction           | false        |
            | block                     | false        |
            | idResetRequired           | false        |
            | pswAndIdResetRequired     | false        |
            | unblock                   | false        |
            | userActionIdResetSuccess  | false        |
            | userActionPswResetSuccess | false        |
            | unSuspendAction           | false        |

    @regression
    Scenario Outline: Happy Path - Get Request to /ais/userId - allowable Transition from <originalAisEventType> to <allowableAisEventType> - Return expected data
        Given I send an <allowableAisEventType> allowable intervention event message to the TxMA ingress SQS queue for a Account in <originalAisEventType> state
        When I invoke the API to retrieve the allowable intervention status of the user's account. With history <historyValue>
        Then I expect the response with all the valid state fields for the <allowableAisEventType>
        Examples:
            | originalAisEventType  | allowableAisEventType | historyValue |
            # passsword reset account status to new intervention type
            | pswResetRequired      | pswResetRequired      | false        |
            | pswResetRequired      | suspendNoAction       | false        |
            | pswResetRequired      | block                 | false        |
            | pswResetRequired      | idResetRequired       | false        |
            | pswResetRequired      | pswAndIdResetRequired | false        |
            | pswResetRequired      | unSuspendAction       | false        |
            # suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired      | false        |
            | suspendNoAction       | suspendNoAction       | false        |
            | suspendNoAction       | block                 | false        |
            | suspendNoAction       | idResetRequired       | false        |
            | suspendNoAction       | pswAndIdResetRequired | false        |
            | suspendNoAction       | unSuspendAction       | false        |
            # blocked account status to new intervention type
            | block                 | unblock               | false        |
            # Id reset account status to new intervention type
            | idResetRequired       | pswResetRequired      | false        |
            | idResetRequired       | suspendNoAction       | false        |
            | idResetRequired       | block                 | false        |
            | idResetRequired       | idResetRequired       | false        |
            | idResetRequired       | pswAndIdResetRequired | false        |
            | idResetRequired       | unSuspendAction       | false        |
            # password and ID reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired      | false        |
            | pswAndIdResetRequired | suspendNoAction       | false        |
            | pswAndIdResetRequired | block                 | false        |
            | pswAndIdResetRequired | idResetRequired       | false        |
            | pswAndIdResetRequired | pswAndIdResetRequired | false        |
            | pswAndIdResetRequired | unSuspendAction       | false        |

    @regression
    Scenario Outline: Happy Path - Get Request to /ais/userId - non-allowable Transition from <originalAisEventType> to <nonAllowableAisEventType> - Returns expected data
        Given I send an <nonAllowableAisEventType> non-allowable intervention event message to the TxMA ingress SQS queue for a Account in <originalAisEventType> state
        When I invoke the API to retrieve the non-allowable intervention status of the user's account. With history <historyValue>
        Then I expect the response with all the state fields for the <originalAisEventType>
        Examples:
            | originalAisEventType  | nonAllowableAisEventType  | historyValue |
            # password reset required account status to new intervention type
            | pswResetRequired      | unblock                   | false        |
            | pswResetRequired      | userActionIdResetSuccess  | false        |
            | pswResetRequired      | userActionIdResetSuccess  | false        |
            # suspend no action account status to new intervention type
            | suspendNoAction       | unblock                   | false        |
            | suspendNoAction       | userActionIdResetSuccess  | false        |
            | suspendNoAction       | userActionPswResetSuccess | false        |
            # Id reset account status to new intervention type
            | idResetRequired       | unblock                   | false        |
            | idResetRequired       | userActionPswResetSuccess | false        |
            # password and id reset required account status to new intervention type
            | pswAndIdResetRequired | unblock                   | false        |
            # blocked account status to new intervention type
            | block                 | pswResetRequired          | false        |
            | block                 | suspendNoAction           | false        |
            | block                 | idResetRequired           | false        |
            | block                 | pswAndIdResetRequired     | false        |
            | block                 | userActionIdResetSuccess  | false        |
            | block                 | userActionPswResetSuccess | false        |
            | block                 | unSuspendAction           | false        |

    @regression
    Scenario Outline: Get Request to /ais/userId - Password and Id non-allowable Transition from <originalAisEventType> to <nonAllowableAisEventType> - Returns expected data
        Given I send an <nonAllowableAisEventType> non-allowable event type password or id Reset intervention message to the TxMA ingress SQS queue for a Account in <originalAisEventType> state
        When I invoke the API to retrieve the intervention status of the user's account with history <historyValue>
        Then I expect response with valid fields for <interventionType> with state flags as <blocked>, <suspended>, <resetPassword> and <reproveIdentity>
        Examples:
            | originalAisEventType  | nonAllowableAisEventType  | historyValue | interventionType                                   | blocked | suspended | resetPassword | reproveIdentity |
            | pswResetRequired      | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false   | false     | false         | false           |
            | idResetRequired       | userActionIdResetSuccess  | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false   | false     | false         | false           |
            | pswAndIdResetRequired | userActionIdResetSuccess  | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false   | true      | true          | false           |
            | pswAndIdResetRequired | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false   | true      | false         | true            |

    @regression
    Scenario Outline: Happy Path - Get Request to /ais/userId - allowable Transition from <originalAisEventType> to <allowableAisEventType> - Get Request to /ais/userId - Returns expected data with history values
        Given I send an updated request to the SQS queue with intervention data of the type <allowableAisEventType> from <originalAisEventType>
        When I invoke the API to retrieve the allowable intervention status of the user's account with <historyValue>
        Then I expect the response with history values for the <allowableAisEventType>
        Examples:
            | originalAisEventType  | allowableAisEventType | historyValue |
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
            # password and id reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired      | true         |
            | pswAndIdResetRequired | suspendNoAction       | true         |
            | pswAndIdResetRequired | block                 | true         |
            | pswAndIdResetRequired | idResetRequired       | true         |
            | pswAndIdResetRequired | unSuspendAction       | true         |

    @smoke @regression
    Scenario Outline: Happy Path - Get Request to /ais/userId - Field Validation - Returns Expected Data for <aisEventType> with specific field validation
        Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
        When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint
        Examples:
            | aisEventType    | historyValue | interventionType    | testUserId |
            | suspendNoAction | false        | AIS_NO_INTERVENTION |            |

    @regression
    Scenario: Happy Path - Get Request to /ais/userId - Multiple Transitions from one event type to other event types
        Given I send a multiple requests to sqs queue to transit from one event type to other event types with single userId
        When I invoke apiGateway to retreive the status of the valid userId with history as true
        Then I should receive every transition event history data in the response for the ais endpoint
