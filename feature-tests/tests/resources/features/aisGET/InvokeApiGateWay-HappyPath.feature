Feature: Invoke-APIGateway-HappyPath.feature

    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Data for a userId
        Given I send a request to sqs queue with <aisEventType> data
        When I invoke apiGateway to retreive the status of the userId with <historyValue>
        Then I should receive the appropriate <interventionType>, <blockedState>, <suspendedState>, <resetPassword> and <reproveIdentity> for the ais endpoint
        Examples:
            | aisEventType     | historyValue | interventionType               | blockedState | suspendedState | resetPassword | reproveIdentity |
            | pswResetRequired | false        | AIS_FORCED_USER_PASSWORD_RESET | false        | true           | true          | false           |