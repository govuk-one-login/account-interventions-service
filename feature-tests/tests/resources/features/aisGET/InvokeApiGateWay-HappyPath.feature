Feature: Invoke-APIGateway-HappyPath.feature

    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the intervention to be <interventionType>, with the following state settings <blockedState>, <suspendedState>, <resetPassword> and <reproveIdentity>
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

    Scenario Outline: Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue for a Account in <originalAisEventType> state
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the intervention to be <interventionType>, with the following state settings <blockedState>, <suspendedState>, <resetPassword> and <reproveIdentity>
        Examples:
            | originalAisEventType | aisEventType              | historyValue | interventionType                                   | blockedState | suspendedState | resetPassword | reproveIdentity |
            | suspendNoAction      | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | suspendNoAction      | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction      | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | suspendNoAction      | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | suspendNoAction      | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | suspendNoAction      | unblock                   | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction      | userActionIdResetSuccess  | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction      | userActionPswResetSuccess | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction      | unSuspendAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            ## blocked account status to new intervention type
            | block                | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | block                | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | block                | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | block                | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | block                | unblock                   | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                | userActionIdResetSuccess  | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                | userActionPswResetSuccess | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                | unSuspendAction           | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |

    Scenario Outline: Happy Path - Field Validation - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with specific field validation
        Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
        When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint
        Examples:
            | aisEventType    | historyValue | interventionType    | testUserId |
            | suspendNoAction | false        | AIS_NO_INTERVENTION |            |
