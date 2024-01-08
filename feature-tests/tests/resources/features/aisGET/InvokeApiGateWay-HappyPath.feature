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
            | originalAisEventType  | aisEventType              | historyValue | interventionType                                   | blockedState | suspendedState | resetPassword | reproveIdentity |
            #passsword reset account status to new intervention type
            | pswResetRequired      | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswResetRequired      | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | pswResetRequired      | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | pswResetRequired      | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | pswResetRequired      | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswResetRequired      | unblock                   | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswResetRequired      | userActionIdResetSuccess  | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswResetRequired      | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswResetRequired      | unSuspendAction           | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            #suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | suspendNoAction       | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | suspendNoAction       | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | suspendNoAction       | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | suspendNoAction       | unblock                   | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | userActionIdResetSuccess  | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | userActionPswResetSuccess | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | unSuspendAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            # blocked account status to new intervention type
            | block                 | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | block                 | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | block                 | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | block                 | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | block                 | unblock                   | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | userActionIdResetSuccess  | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | userActionPswResetSuccess | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | unSuspendAction           | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            # Id reset account status to new intervention type
            | idResetRequired       | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | idResetRequired       | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | idResetRequired       | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | idResetRequired       | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | idResetRequired       | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | idResetRequired       | unblock                   | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | idResetRequired       | userActionIdResetSuccess  | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | idResetRequired       | userActionPswResetSuccess | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | idResetRequired       | unSuspendAction           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            # password reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswAndIdResetRequired | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | pswAndIdResetRequired | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | pswAndIdResetRequired | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | pswAndIdResetRequired | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswAndIdResetRequired | unblock                   | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswAndIdResetRequired | userActionIdResetSuccess  | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswAndIdResetRequired | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswAndIdResetRequired | unSuspendAction           | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            # unblock account status to new intervention type
            | unblock               | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | unblock               | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | unblock               | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | unblock               | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | unblock               | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | unblock               | unblock                   | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | unblock               | userActionIdResetSuccess  | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | unblock               | userActionPswResetSuccess | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | unblock               | unSuspendAction           | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            # unsuspended account status to new intervention type
            | unSuspendAction       | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | unSuspendAction       | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | unSuspendAction       | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | unSuspendAction       | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | unSuspendAction       | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | unSuspendAction       | unblock                   | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | unSuspendAction       | userActionIdResetSuccess  | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | unSuspendAction       | userActionPswResetSuccess | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |
            | unSuspendAction       | unSuspendAction           | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           |


Scenario Outline: Happy Path - Field Validation - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with specific field validation
    Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
    When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
    Then I should receive the appropriate <interventionType> for the ais endpoint
    Examples:
        | aisEventType    | historyValue | interventionType    | testUserId |
        | suspendNoAction | false        | AIS_NO_INTERVENTION |            |
