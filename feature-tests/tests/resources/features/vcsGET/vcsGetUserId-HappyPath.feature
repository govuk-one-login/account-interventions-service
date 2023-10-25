Feature: VCS-UserId-GET-HappyPath.feature

    Background: Set up and Obtain Authorization Values for GET requests
        Given I created a valid new valid userId
        Given I have obtained a valid api key

    Scenario Outline: Happy Path - Get Request to /vcs/userId - Returns Decrypted VC Data for a userId with specific signatureType
        Given I have obtained an authorization token with <signatureType>
        Given I prepopulate the database with valid VCs for userId
        When I send a GET request with <contentType> and <accept> to the GET vcs endpoint
        Then I should receive the appropriate <statusCode> for the request to get the userId VC data from the VCS endpoint
        Examples:
            | signatureType | contentType      | accept | statusCode |
            | EC            | application/json | */*    | 200        |
            | RSA           | application/json | */*    | 200        |
            | DEFAULT       | application/json | */*    | 200        |

    Scenario Outline: Happy Path - Get Request to /vcs/userId - Returns Decrypted VC Data for a userId with Expiry Variations
        Given I have send a request to obtain a valid authorization token with <ttl> and <iat>
        Given I prepopulate the database with valid VCs for userId
        When I send a GET request with <contentType> and <accept> to the GET vcs endpoint
        Then I should receive the appropriate <statusCode> for the request to get the userId VC data from the VCS endpoint
        Examples:
            | ttl | iat | contentType      | accept | statusCode |
            | 120 | 0   | application/json | */*    | 200        |
            | 0   | 120 | application/json | */*    | 200        |

    Scenario Outline: Happy Path - Get Request to /vcs/userId - For UserId with No VCs, Returns Data Not Found Response
        Given I have obtained an authorization token with <signatureType>
        Given There is no data stored for the given userId
        When I send a GET request with <contentType> and <accept> to the GET vcs endpoint
        Then I should receive a <statusCode> response for the request
        Examples:
            | signatureType | contentType      | accept | statusCode |
            | DEFAULT       | application/json | */*    | 404        |

    Scenario Outline: Happy Path - Get Request to /vcs/userId - Returns Decrypted VC Data when using Url Encoded userId
        Given I have obtained an authorization token with <signatureType>
        Given I prepopulate the database with valid VCs for userId
        When I send a request with <contentType>, <accept> to the GET vcs endpoint with a URL encoded userId
        Then I should receive the appropriate <statusCode> for the request to get the userId VC data from the VCS endpoint
        Examples:
            | signatureType | contentType      | accept | statusCode |
            | DEFAULT       | application/json | */*    | 200        |

    Scenario Outline: Happy Path - Get Request to /vcs/userId - Mixed Case Headers - Returns Decrypted VC Data
        Given I have obtained an authorization token with <signatureType>
        Given I prepopulate the database with valid VCs for userId
        When I send a request with mixed case <authorizationHeaderKey> and <xapikeyHeaderKey> to the GET endpoint
        Then I should receive the appropriate <statusCode> for the request to get the userId VC data from the VCS endpoint
        Examples:
            | signatureType | authorizationHeaderKey | xapikeyHeaderKey | statusCode |
            | DEFAULT       | AuThoriZatioN          | x-api-key        | 200        |
            | DEFAULT       | AUTHORIZATION          | x-api-Key        | 200        |
            | DEFAULT       | authorization          | x-Api-Key        | 200        |
            | DEFAULT       | authorization          | X-API-KEY        | 200        |

    Scenario Outline: Happy Path - Get Request to /vcs/userId - Returns Decrypted VC Data using afterKey for more than Max Limit of VCs
        Given I have obtained an authorization token with <signatureType>
        Given I prepopulate the userId database with valid VCs
        And I prepolulate the database with max limit of valid VCs for the same userId
        When I send a GET request with <contentType> and <accept> to the GET vcs endpoint
        And I receive the <statusCode> and after key value in the GET response
        And I send the after key value as a query parameter in the GET vcs endpoint
        Then I receive the <statusCode> and validate vcs retreive is unique in the GET vcs response
        Examples:
            | signatureType | contentType      | accept | statusCode |
            | DEFAULT       | application/json | */*    | 200        |
