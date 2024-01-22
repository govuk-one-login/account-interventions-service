Feature: Invoke-APIGateway-HappyPath.feature

    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the intervention to be <interventionType>, with the following state settings <blockedState>, <suspendedState>, <resetPassword> and <reproveIdentity> with the <auditLevel> returned
        Examples:
            | aisEventType              | historyValue | interventionType                                   | blockedState | suspendedState | resetPassword | reproveIdentity | auditLevel |
            | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           | standard   |
            | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            | standard   |
            | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            | standard   |
            | unblock                   | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           | standard   |
            | userActionIdResetSuccess  | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           | standard   |
            | userActionPswResetSuccess | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           | standard   |
            | unSuspendAction           | false        | AIS_NO_INTERVENTION                                | false        | false          | false         | false           | standard   |

    Scenario Outline: Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType>
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue for a Account in <originalAisEventType> state
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the intervention to be <interventionType>, with the following state settings <blockedState>, <suspendedState>, <resetPassword> and <reproveIdentity> with the <auditLevel> returned
        Examples:
            | originalAisEventType  | aisEventType              | historyValue | interventionType                                   | blockedState | suspendedState | resetPassword | reproveIdentity | auditLevel |
            # passsword reset account status to new intervention type
            | pswResetRequired      | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           | standard   |
            | pswResetRequired      | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | pswResetRequired      | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | pswResetRequired      | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            | standard   |
            | pswResetRequired      | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            | standard   |
            | pswResetRequired      | unblock                   | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           | standard   |
            | pswResetRequired      | userActionIdResetSuccess  | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           | standard   |
            | pswResetRequired      | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | false          | false         | false           | standard   |
            | pswResetRequired      | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           | standard   |
            # suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           | standard   |
            | suspendNoAction       | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | suspendNoAction       | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | suspendNoAction       | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            | standard   |
            | suspendNoAction       | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            | standard   |
            | suspendNoAction       | unblock                   | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | suspendNoAction       | userActionIdResetSuccess  | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | suspendNoAction       | userActionPswResetSuccess | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | suspendNoAction       | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           | standard   |
            # blocked account status to new intervention type
            | block                 | pswResetRequired          | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | block                 | suspendNoAction           | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | block                 | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | block                 | idResetRequired           | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | block                 | pswAndIdResetRequired     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | block                 | unblock                   | false        | AIS_ACCOUNT_UNBLOCKED                              | false        | false          | false         | false           | standard   |
            | block                 | userActionIdResetSuccess  | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | block                 | userActionPswResetSuccess | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | block                 | unSuspendAction           | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            # Id reset account status to new intervention type
            | idResetRequired       | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           | standard   |
            | idResetRequired       | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | idResetRequired       | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | idResetRequired       | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            | standard   |
            | idResetRequired       | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            | standard   |
            | idResetRequired       | unblock                   | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            | standard   |
            | idResetRequired       | userActionIdResetSuccess  | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | false          | false         | false           | standard   |
            | idResetRequired       | userActionPswResetSuccess | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            | standard   |
            | idResetRequired       | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           | standard   |
            # password reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired          | false        | AIS_FORCED_USER_PASSWORD_RESET                     | false        | true           | true          | false           | standard   |
            | pswAndIdResetRequired | suspendNoAction           | false        | AIS_ACCOUNT_SUSPENDED                              | false        | true           | false         | false           | standard   |
            | pswAndIdResetRequired | block                     | false        | AIS_ACCOUNT_BLOCKED                                | true         | false          | false         | false           | standard   |
            | pswAndIdResetRequired | idResetRequired           | false        | AIS_FORCED_USER_IDENTITY_VERIFY                    | false        | true           | false         | true            | standard   |
            | pswAndIdResetRequired | pswAndIdResetRequired     | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            | standard   |
            | pswAndIdResetRequired | unblock                   | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | true            | standard   |
            | pswAndIdResetRequired | userActionIdResetSuccess  | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | true          | false           | standard   |
            | pswAndIdResetRequired | userActionPswResetSuccess | false        | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | false        | true           | false         | true            | standard   |
            | pswAndIdResetRequired | unSuspendAction           | false        | AIS_ACCOUNT_UNSUSPENDED                            | false        | false          | false         | false           | standard   |


    Scenario Outline: Happy Path - <originalAisEventType> account - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with History values
        Given I send an updated request to the SQS queue with intervention data of the type <aisEventType> from <originalAisEventType>
        When I invoke the API to retrieve the intervention status of the user's account with <historyValue>
        Then I expect the intervention to be <interventionType>, with the following history values with <componentHistory>, <interventionCodeHistory>, <interventionHistory>, <reason> with the <auditLevel> returned
        Examples:
            | originalAisEventType  | aisEventType          | historyValue | interventionType                                   | componentHistory | interventionCodeHistory | interventionHistory                                          | reason                     | auditLevel |
            # passsword reset account status to new intervention type
            | pswResetRequired      | suspendNoAction       | true         | AIS_ACCOUNT_SUSPENDED                              | TICF_CRI         | 01                      | FRAUD_SUSPEND_ACCOUNT                                        | suspend - 01               | standard   |
            | pswResetRequired      | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 | standard   |
            | pswResetRequired      | idResetRequired       | true         | AIS_FORCED_USER_IDENTITY_VERIFY                    | TICF_CRI         | 05                      | FRAUD_FORCED_USER_IDENTITY_REVERIFICATION                    | id reset - 05              | standard   |
            | pswResetRequired      | pswAndIdResetRequired | true         | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | TICF_CRI         | 06                      | FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION | password and id reset - 06 | standard   |
            | pswResetRequired      | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             | standard   |
            # suspend no action account status to new intervention type
            | suspendNoAction       | pswResetRequired      | true         | AIS_FORCED_USER_PASSWORD_RESET                     | TICF_CRI         | 04                      | FRAUD_FORCED_USER_PASSWORD_RESET                             | password reset - 04        | standard   |
            | suspendNoAction       | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 | standard   |
            | suspendNoAction       | idResetRequired       | true         | AIS_FORCED_USER_IDENTITY_VERIFY                    | TICF_CRI         | 05                      | FRAUD_FORCED_USER_IDENTITY_REVERIFICATION                    | id reset - 05              | standard   |
            | suspendNoAction       | pswAndIdResetRequired | true         | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | TICF_CRI         | 06                      | FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION | password and id reset - 06 | standard   |
            | suspendNoAction       | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             | standard   |
            # blocked account status to new intervention type
            | block                 | unblock               | true         | AIS_ACCOUNT_UNBLOCKED                              | TICF_CRI         | 07                      | FRAUD_UNBLOCK_ACCOUNT                                        | unblock - 07               | standard   |
            # Id reset account status to new intervention type
            | idResetRequired       | pswResetRequired      | true         | AIS_FORCED_USER_PASSWORD_RESET                     | TICF_CRI         | 04                      | FRAUD_FORCED_USER_PASSWORD_RESET                             | password reset - 04        | standard   |
            | idResetRequired       | suspendNoAction       | true         | AIS_ACCOUNT_SUSPENDED                              | TICF_CRI         | 01                      | FRAUD_SUSPEND_ACCOUNT                                        | suspend - 01               | standard   |
            | idResetRequired       | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 | standard   |
            | idResetRequired       | pswAndIdResetRequired | true         | AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY | TICF_CRI         | 06                      | FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION | password and id reset - 06 | standard   |
            | idResetRequired       | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             | standard   |
            # password reset required account status to new intervention type
            | pswAndIdResetRequired | pswResetRequired      | true         | AIS_FORCED_USER_PASSWORD_RESET                     | TICF_CRI         | 04                      | FRAUD_FORCED_USER_PASSWORD_RESET                             | password reset - 04        | standard   |
            | pswAndIdResetRequired | suspendNoAction       | true         | AIS_ACCOUNT_SUSPENDED                              | TICF_CRI         | 01                      | FRAUD_SUSPEND_ACCOUNT                                        | suspend - 01               | standard   |
            | pswAndIdResetRequired | block                 | true         | AIS_ACCOUNT_BLOCKED                                | TICF_CRI         | 03                      | FRAUD_BLOCK_ACCOUNT                                          | block - 03                 | standard   |
            | pswAndIdResetRequired | idResetRequired       | true         | AIS_FORCED_USER_IDENTITY_VERIFY                    | TICF_CRI         | 05                      | FRAUD_FORCED_USER_IDENTITY_REVERIFICATION                    | id reset - 05              | standard   |
            | pswAndIdResetRequired | unSuspendAction       | true         | AIS_ACCOUNT_UNSUSPENDED                            | TICF_CRI         | 02                      | FRAUD_UNSUSPEND_ACCOUNT                                      | unsuspend - 02             | standard   |


    Scenario Outline: Happy Path - Field Validation - Get Request to /ais/userId - Returns Expected Data for <aisEventType> with specific field validation
        Given I send a invalid request to sqs queue with no userId and <aisEventType>, <testUserId> data
        When I invoke apiGateway to retreive the status of the invalid userId with <historyValue>
        Then I should receive the appropriate <interventionType> for the ais endpoint with the <auditLevel> returned
        Examples:
            | aisEventType    | historyValue | interventionType    | testUserId | auditLevel |
            | suspendNoAction | false        | AIS_NO_INTERVENTION |            | standard   |
