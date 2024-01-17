Feature: Invoke-APIGateway-HappyPath.feature

    @regression
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
  
    @regression
    Scenario Outline: Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue for a Account in <originalAisEventType> state
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the intervention to be <interventionType>, with the following state settings <blockedState>, <suspendedState>, <resetPassword> and <reproveIdentity>
        Examples:
            | originalAisEventType  | aisEventType              | historyValue | interventionType                                   | blockedState | suspendedState | resetPassword | reproveIdentity |
            # passsword reset account status to new intervention type
            | pswResetRequired      | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswResetRequired      | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | pswResetRequired      | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | pswResetRequired      | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | pswResetRequired      | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswResetRequired      | unblock                   | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswResetRequired      | userActionIdResetSuccess  | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswResetRequired      | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | false          | false         | false           |
            | pswResetRequired      | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           |
            # suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | suspendNoAction       | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | suspendNoAction       | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | suspendNoAction       | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | suspendNoAction       | unblock                   | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | userActionIdResetSuccess  | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | userActionPswResetSuccess | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | suspendNoAction       | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           |
            # blocked account status to new intervention type
            | block                 | pswResetRequired          | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | suspendNoAction           | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | idResetRequired           | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | pswAndIdResetRequired     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | block                 | unblock                   | false        | AIS_ACCOUNT_UNBLOCKED                              | false        | false          | false         | false           |
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
            | idResetRequired       | userActionIdResetSuccess  | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | false          | false         | false           |
            | idResetRequired       | userActionPswResetSuccess | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | idResetRequired       | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           |
            # password reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           |
            | pswAndIdResetRequired | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           |
            | pswAndIdResetRequired | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           |
            | pswAndIdResetRequired | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            |
            | pswAndIdResetRequired | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswAndIdResetRequired | unblock                   | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            |
            | pswAndIdResetRequired | userActionIdResetSuccess  | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | false           |
            | pswAndIdResetRequired | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | false         | true            |
            | pswAndIdResetRequired | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           |

    @regression
    Scenario Outline: Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with History values
        Given I send an updated request to the SQS queue with intervention data of the type <aisEventType> from <originalAisEventType>
        When I invoke the API to retrieve the intervention status of the user's account with <historyValue>
        Then I expect the intervention to be <interventionType>, with the following history values with <componentHistory>, <interventionCodeHistory>, <interventionHistory>, <reason>
        Examples:
            | originalAisEventType  | aisEventType          | historyValue | interventionType                                   | componentHistory | interventionCodeHistory | interventionHistory                                          | reason                     |
            # passsword reset account status to new intervention type
            | pswResetRequired      | suspendNoAction       | true         | AIS_ACCOUNT_SUSPENDED                              | TICF_CRI         | 01                      | FRAUD_SUSPEND_ACCOUNT                                        | suspend - 01               |
            | pswResetRequired      | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 |
            | pswResetRequired      | idResetRequired       | true         | AIS_FORCED_USER_IDENTITY_VERIFY                    | TICF_CRI         | 05                      | FRAUD_FORCED_USER_IDENTITY_REVERIFICATION                    | id reset - 05              |
            | pswResetRequired      | pswAndIdResetRequired | true         | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | TICF_CRI         | 06                      | FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION | password and id reset - 06 |
            | pswResetRequired      | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             |
            # suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired      | true         | AIS_FORCED_USER_PASSWORD_RESET                     | TICF_CRI         | 04                      | FRAUD_FORCED_USER_PASSWORD_RESET                             | password reset - 04        |
            | suspendNoAction       | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 |
            | suspendNoAction       | idResetRequired       | true         | AIS_FORCED_USER_IDENTITY_VERIFY                    | TICF_CRI         | 05                      | FRAUD_FORCED_USER_IDENTITY_REVERIFICATION                    | id reset - 05              |
            | suspendNoAction       | pswAndIdResetRequired | true         | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | TICF_CRI         | 06                      | FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION | password and id reset - 06 |
            | suspendNoAction       | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             |
            # blocked account status to new intervention type
            | block                 | unblock               | true         | AIS_ACCOUNT_UNBLOCKED                              | TICF_CRI         | 07                      | FRAUD_UNBLOCK_ACCOUNT                                        | unblock - 07               |
            # Id reset account status to new intervention type
            | idResetRequired       | pswResetRequired      | true         | AIS_FORCED_USER_PASSWORD_RESET                     | TICF_CRI         | 04                      | FRAUD_FORCED_USER_PASSWORD_RESET                             | password reset - 04        |
            | idResetRequired       | suspendNoAction       | true         | AIS_ACCOUNT_SUSPENDED                              | TICF_CRI         | 01                      | FRAUD_SUSPEND_ACCOUNT                                        | suspend - 01               |
            | idResetRequired       | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 |
            | idResetRequired       | pswAndIdResetRequired | true         | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | TICF_CRI         | 06                      | FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION | password and id reset - 06 |
            | idResetRequired       | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             |
            # password reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired      | true         | AIS_FORCED_USER_PASSWORD_RESET                     | TICF_CRI         | 04                      | FRAUD_FORCED_USER_PASSWORD_RESET                             | password reset - 04        |
            | pswAndIdResetRequired | suspendNoAction       | true         | AIS_ACCOUNT_SUSPENDED                              | TICF_CRI         | 01                      | FRAUD_SUSPEND_ACCOUNT                                        | suspend - 01               |
            | pswAndIdResetRequired | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 |
            | pswAndIdResetRequired | idResetRequired       | true         | AIS_FORCED_USER_IDENTITY_VERIFY                    | TICF_CRI         | 05                      | FRAUD_FORCED_USER_IDENTITY_REVERIFICATION                    | id reset - 05              |
            | pswAndIdResetRequired | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             |

    @smoke
    Scenario Outline: Happy Path - Field Validation - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with specific field validation
        Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
        When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint
        Examples:
            | aisEventType    | historyValue | interventionType    | testUserId |
            | suspendNoAction | false        | AIS_NO_INTERVENTION |            |
