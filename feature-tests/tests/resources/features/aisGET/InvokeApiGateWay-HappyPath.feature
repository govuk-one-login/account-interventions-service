Feature: Invoke-APIGateway-HappyPath.feature

    Scenario Outline: Happy Path - Get Request to /ais/userId - Returns Expected Data
        Given I send an <aisEventType> intervention message to the TxMA ingress SQS queue
        When I invoke the API to retrieve the intervention status of the user's account. With history <historyValue>
        Then I expect the intervention to be <interventionType>, with the following state settings <blockedState>, <suspendedState>, <resetPassword> and <reproveIdentity>
        Examples:
            | aisEventType     | historyValue | interventionType               | blockedState | suspendedState | resetPassword | reproveIdentity |
            | pswResetRequired | false        | AIS_FORCED_USER_PASSWORD_RESET | false        | true           | true          | false           |
