Feature: VCS-UserId-GET-NegativeCases.feature

  Background: Set up UserId for GET requests
    Given I created a valid new valid userId

  Scenario Outline: Negative Case - Get Request to /vcs/userId - Invalid Endpoint
    Given I send a invalid GET request to the VCS endpoint using an invalid endpoint
    Then I should receive a response with <statusCode> and <responseMessage>
    Examples:
      | statusCode | responseMessage            |
      | 403        | not a valid key=value pair |

  # Scenario Outline: Negative Case - Request to GET /vcs/userId - Throttling Tests
  #   Given I have obtained an authorization token with <signatureType>
  #   Given I prepopulate the database with valid VCs for userId
  #   Given I send a multiple requests with valid authorization token and valid apikey to get vcs endpoint
  #   Then I should receive the <statusCode> and <responseMessage> in the GET vcs response
  #   Examples:
  #     | signatureType | statusCode | responseMessage   |
  #     | RSA           | 429        | Too Many Requests |
