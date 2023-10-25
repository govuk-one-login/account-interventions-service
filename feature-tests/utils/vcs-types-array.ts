export const vcs = {
  addressVCS: [
    {
      sub: '',
      nbf: 1_694_513_707,
      iss: 'https://review-a.dev.account.gov.uk',
      vc: {
        credentialSubject: {
          address: [
            {
              addressCountry: 'GB',
              uprn: 100_120_012_077,
              buildingName: '',
              streetName: 'HADLEY ROAD',
              postalCode: 'BA2 5AA',
              buildingNumber: '8',
              addressLocality: 'BATH',
              validFrom: '2000-01-01',
              subBuildingName: '',
            },
          ],
        },
        type: ['VerifiableCredential', 'AddressCredential'],
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://vocab.london.cloudapps.digital/contexts/identity-v1.jsonld',
        ],
      },
      jti: '',
    },
  ],
  drivingLicenceVCS: [
    {
      sub: '',
      nbf: 1_694_513_707,
      iss: 'https://review-d.build.account.gov.uk',
      vc: {
        evidence: [
          {
            activityHistoryScore: 1,
            checkDetails: {
              identityCheckPolicy: 'published',
              activityFrom: '1982-05-23',
              checkMethod: 'data',
            },
            validityScore: 2,
            strengthScore: 3,
            txn: 'f64579bb-3875-4f98-9b15-6060e2be0432',
            type: 'IDENTITY_CHECK',
          },
        ],
        credentialSubject: {
          address: [
            {
              addressCountry: 'GB',
              postalCode: 'BS981TL',
            },
          ],
          name: [
            {
              nameParts: [
                {
                  type: 'GivenName',
                  value: 'Peter',
                },
                {
                  type: 'GivenName',
                  value: 'Benjamin',
                },
                {
                  type: 'FamilyName',
                  value: 'Parker',
                },
              ],
            },
          ],
          birthDate: [
            {
              value: '1962-10-11',
            },
          ],
        },
        drivingPermit: [
          {
            expiryDate: '2062-12-09',
            documentNumber: 'PARKE610112PBFGH',
            issuedBy: 'DVLA',
          },
        ],
        type: ['VerifiableCredential', 'IdentityCheckCredential'],
      },
    },
  ],
  fraudVCS: [
    {
      sub: '',
      nbf: 1_694_513_707,
      iss: 'https://review-f.dev.account.gov.uk',
      vc: {
        evidence: [
          {
            activityHistoryScore: 1,
            checkDetails: [
              {
                checkMethod: 'data',
                fraudCheck: 'mortality_check',
              },
              {
                checkMethod: 'data',
                fraudCheck: 'identity_theft_check',
              },
              {
                checkMethod: 'data',
                fraudCheck: 'synthetic_identity_check',
              },
              {
                checkMethod: 'data',
                fraudCheck: 'impersonation_risk_check',
                txn: 'RB000166536655',
              },
              {
                identityCheckPolicy: 'none',
                activityFrom: '1963-01-01',
                checkMethod: 'data',
              },
            ],
            ci: [],
            txn: 'RB000166536640',
            identityFraudScore: 2,
            type: 'IdentityCheck',
          },
        ],
        credentialSubject: {
          address: [
            {
              addressCountry: 'GB',
              buildingName: '',
              streetName: 'HADLEY ROAD',
              postalCode: 'BA2 5AA',
              buildingNumber: '8',
              addressLocality: 'BATH',
              subBuildingName: '',
            },
          ],
          name: [
            {
              nameParts: [
                {
                  type: 'GivenName',
                  value: 'Kenneth',
                },
                {
                  type: 'FamilyName',
                  value: 'Decerqueira',
                },
              ],
            },
          ],
          birthDate: [
            {
              value: '1965-07-08',
            },
          ],
        },
        type: ['VerifiableCredential', 'IdentityCheckCredential'],
      },
    },
  ],
  kbvVCS: [
    {
      sub: '',
      nbf: 1_694_513_707,
      iss: 'https://review-k.dev.account.gov.uk',
      vc: {
        evidence: [
          {
            checkDetails: [
              {
                kbvResponseMode: 'multiple_choice',
                kbvQuality: 3,
                checkMethod: 'kbv',
              },
              {
                kbvResponseMode: 'multiple_choice',
                kbvQuality: 3,
                checkMethod: 'kbv',
              },
              {
                kbvResponseMode: 'multiple_choice',
                kbvQuality: 2,
                checkMethod: 'kbv',
              },
            ],
            verificationScore: 2,
            txn: '8QCKXGJQ9L',
            type: 'IdentityCheck',
          },
        ],
        credentialSubject: {
          address: [
            {
              addressCountry: 'GB',
              uprn: 100_120_012_077,
              buildingName: '',
              streetName: 'HADLEY ROAD',
              postalCode: 'BA2 5AA',
              buildingNumber: '8',
              addressLocality: 'BATH',
              validFrom: '2000-01-01',
              subBuildingName: '',
            },
          ],
          name: [
            {
              nameParts: [
                {
                  type: 'GivenName',
                  value: 'Kenneth',
                },
                {
                  type: 'FamilyName',
                  value: 'Decerqueira',
                },
              ],
            },
          ],
          birthDate: [
            {
              value: '1965-07-08',
            },
          ],
        },
        type: ['VerifiableCredential', 'IdentityCheckCredential'],
      },
      jti: 'urn:uuid:551a9b25-43b3-429e-8db9-bb0b5545191b',
    },
  ],
  passportVCS: [
    {
      sub: '',
      nbf: 1_694_513_707,
      iss: 'https://review-p.dev.account.gov.uk',
      vc: {
        evidence: [
          {
            validityScore: 2,
            strengthScore: 4,
            txn: 'a4069ca4-be09-40c3-939d-87a45cb8cc31',
            type: 'IdentityCheck',
          },
        ],
        credentialSubject: {
          passport: [
            {
              expiryDate: '2030-01-01',
              icaoIssuerCode: 'GBR',
              documentNumber: '321654987',
            },
          ],
          name: [
            {
              nameParts: [
                {
                  type: 'GivenName',
                  value: 'Kenneth',
                },
                {
                  type: 'FamilyName',
                  value: 'Decerqueira',
                },
              ],
            },
          ],
          birthDate: [
            {
              value: '1965-07-08',
            },
          ],
        },
        type: ['VerifiableCredential', 'IdentityCheckCredential'],
      },
    },
  ],
  biometricVCS: [
    {
      sub: '',
      nbf: 1_694_513_707,
      iss: 'https://review-b.build.account.gov.uk',
      vc: {
        '@odata.context': '/odata/v1/ODataServlet/$metadata',
        api: undefined,
        app: {
          appVersion: '4.84.3',
          customerName: 'ReadID NFC VIZ Demo',
          packageName: 'com.readid.ReadID-UI-NFC-VIZ',
          timestamp: undefined,
        },
        Base64PDF: undefined,
        chip: {
          chipRead: true,
          chipTypes: ['NfcA'],
          extendedLengthAPDUSupported: undefined,
          timestamp: undefined,
        },
        clientId: 'com.readid.ReadID-UI-NFC-VIZ',
        consolidatedIdentityData: {
          chipCloneDetection: 'SUCCEEDED',
          chipCloneDetectionSource: 'CHIP',
          chipCloneDetectionSourceName: 'ReadID NFC',
          chipVerification: 'SUCCEEDED',
          chipVerificationSource: 'CHIP',
          chipVerificationSourceName: 'ReadID NFC',
          creationDate: '2022-10-05T07:39:17.438Z',
          dateOfBirth: '600101',
          dateOfBirthSource: 'CHIP',
          dateOfBirthSourceName: 'ReadID NFC',
          dateOfExpiry: '270801',
          dateOfExpirySource: 'CHIP',
          dateOfExpirySourceName: 'ReadID NFC',
          documentCode: 'P',
          documentCodeSource: 'CHIP',
          documentCodeSourceName: 'ReadID NFC',
          documentNumber: '549364783',
          documentNumberSource: 'CHIP',
          documentNumberSourceName: 'ReadID NFC',
          documentType: 'P',
          documentTypeSource: 'CHIP',
          documentTypeSourceName: 'ReadID NFC',
          gender: 'FEMALE',
          genderSource: 'CHIP',
          genderSourceName: 'ReadID NFC',
          issuingCountry: 'GBR',
          issuingCountrySource: 'CHIP',
          issuingCountrySourceName: 'ReadID NFC',
          nameOfHolder: 'OTHER FORTYFOUR, ANNA NICHOLA',
          nameOfHolderSource: 'CHIP',
          nameOfHolderSourceName: 'ReadID NFC',
          nationality: 'GBR',
          nationalitySource: 'CHIP',
          nationalitySourceName: 'ReadID NFC',
          personalNumber: undefined,
          personalNumberSource: undefined,
          personalNumberSourceName: undefined,
          placeOfBirth: undefined,
          placeOfBirthSource: undefined,
          placeOfBirthSourceName: undefined,
          primaryIdentifier: 'OTHER FORTYFOUR',
          primaryIdentifierSource: 'CHIP',
          primaryIdentifierSourceName: 'ReadID NFC',
          secondaryIdentifier: 'ANNA NICHOLA',
          secondaryIdentifierSource: 'CHIP',
          secondaryIdentifierSourceName: 'ReadID NFC',
          selfieVerificationProfile: 'UNKNOWN',
          selfieVerificationProfileSource: 'VISUAL_AUTOMATIC',
          selfieVerificationProfileSourceName: 'iProov',
          selfieVerificationStatus: 'SUCCEEDED',
          selfieVerificationStatusSource: 'VISUAL_AUTOMATIC',
          selfieVerificationStatusSourceName: 'iProov',
          sessionId: '6d3240ed-ae7c-4ef0-827c-a6d0cda7319d',
          version: 1,
          visualVerification: undefined,
          visualVerificationSource: undefined,
          visualVerificationSourceName: undefined,
        },
        creationDate: '2022-10-05T07:39:17.438Z',
        customerApplicationReference: 'VeriffLiveEnabledWithIProov',
        deviceId: 'a3017511-b639-46ff-ab73-66e5ab0193c9',
        deviceInfo: {
          brand: 'Apple',
          extendedLengthApduSupported: true,
          manufacturer: 'Apple',
          maxTransceiveLength: 65_535,
          model: 'iPhone11,8',
          OSVersion: '15.7',
          platform: 'iOS',
          timestamp: undefined,
        },
        dgsFilterEnabled: false,
        documentContent: {
          '@odata.type': '#nl.innovalor.mrtd.model.ICAODocumentContent',
          datagroupNumbers: [1, 2, 14],
          dateOfBirth: '600101',
          dateOfExpiry: '270801',
          dateOfIssue: undefined,
          documentNumber: '549364783',
          faceImages: [
            {
              colorSpace: 'RGB24',
              height: 483,
              image: '/odata/v1/Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/faceImage/0',
              mimeType: 'image/jpeg',
              original: '/odata/v1/Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/faceImage/0/original',
              originalImageBytes: undefined,
              source: 'STATIC_PHOTO_SCANNER',
              width: 383,
            },
          ],
          fullDateOfBirth: undefined,
          interpretedDateOfBirth: '01.01.1960',
          interpretedDateOfExpiry: '01.08.2027',
          interpretedIssuingCountry: 'United Kingdom',
          issuingAuthority: undefined,
          issuingCountry: 'GBR',
          ldsVersion: '1.7',
          nameOfHolder: 'OTHER FORTYFOUR, ANNA NICHOLA',
          personalNumber: '',
          primaryIdentifier: 'OTHER FORTYFOUR',
          secondaryIdentifier: 'ANNA NICHOLA',
          signatureImages: [],
          custodian: undefined,
          documentCode: 'P',
          gender: 'FEMALE',
          interpretedNationality: 'British',
          mrzPrimaryIdentifier: 'OTHER FORTYFOUR',
          mrzSecondaryIdentifier: 'ANNA NICHOLA',
          MRZString: 'P<GBROTHER<FORTYFOUR<<ANNA<NICHOLA<<<<<<<<<<5493647835GBR6001010F2708012<<<<<<<<<<<<<<02',
          nationality: 'GBR',
          otherNames: [],
          permanentAddress: [],
          placeOfBirth: '',
          placeOfBirthList: [],
          profession: undefined,
          telephone: undefined,
          title: undefined,
          unicodeVersion: '4.0.0',
        },
        documentMetadata: undefined,
        exceptions: [],
        expiryDate: '2022-10-10T07:39:17.438Z',
        icaoDgsFilter: [],
        instanceId: 'c00efeb4-d7b2-4764-96ad-803638a68af8',
        iProovSession: {
          assuranceType: 'GENUINE_PRESENCE',
          attempts: 1,
          enrolmentImageSource: 'Chip',
          enrolmentPod: 'cluster',
          enrolmentToken: '335f2dd9b9766ef80bf349b820c6c1b7cc644fcab0144c5202c685e91801vi07',
          errorString: undefined,
          finished: true,
          hasError: false,
          passed: true,
          riskProfile: undefined,
          verifyToken: [
            {
              frameImage: {
                height: 852,
                mimeType: 'image/png',
                sha256Sum: 'Eh7LSjwMqbUmG5JBaj5UidUhD7L0WFcCH6n9VdOOzXg=',
                url: 'Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/iProovSession/verifyTokens/9f2d324ffbd348f2fde22c090888c7276a630827080e01f8e018e91d1801vi07/frameImage/image',
                width: 480,
              },
              reason: undefined,
              riskProfile: undefined,
              verifyToken: '9f2d324ffbd348f2fde22c090888c7276a630827080e01f8e018e91d1801vi07',
              verifyTokenPassed: true,
              verifyTokenPod: 'cluster',
              verifyTokenResponse: undefined,
              verifyTokenSignature: undefined,
              verifyTokenSignatureVersion: undefined,
              verifyTokenTimestamp: '1664955565626',
            },
          ],
        },
        lib: {
          coreVersion: '4.84.3',
          mobileCountryCode: undefined,
          mrtdConfiguration: {
            AAEnabled: true,
            accessControlPriority: undefined,
            allowedFids: [],
            BACByDefaultEnabled: true,
            clientServerBaseURL: undefined,
            clientServerHttpRetries: undefined,
            clientServerHttpWaitPeriod: undefined,
            CSCAKeyStoreTypeName: undefined,
            debugModeEnabled: undefined,
            documentType: 'ICAO_MRTD',
            DSCSEnabled: true,
            EACCAEnabled: true,
            extendedLengthAPDUEnabled: false,
            extendedLengthMaxBufferBlockSize: 1024,
            NFCForegroundDispatchMuteTime: 0,
            NFCMinimalIsoDepTimeout: undefined,
            NFCReaderModePresenceCheckDelay: undefined,
            PACEEnabled: false,
            timestamp: undefined,
          },
          mrtdConfigurationPreferences: undefined,
          nfcVersion: undefined,
          ocrConfiguration: {
            allowedSizes: [],
            defaultCorrectnessCriterionUsed: undefined,
            diligence: undefined,
            focusMode: undefined,
            scaleMode: undefined,
            timestamp: undefined,
          },
          ocrVersion: undefined,
          timestamp: undefined,
        },
        mrzOCR: undefined,
        NFC: undefined,
        nfcSession: {
          accessControlStatus: {
            BAC: 'PRESENT_SUCCEEDED',
            BACReason: 'SUCCEEDED',
            credentialTypesUsed: [],
            EACTA: 'UNKNOWN',
            EACTAReason: 'UNKNOWN',
            PACE: 'UNKNOWN',
            PACEReason: 'UNKNOWN',
            usedPACEAlgorithmOID: undefined,
            usedPACEDomainParametersID: undefined,
          },
          data: [
            {
              data: '/odata/v1/Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/file/f04c63b3-f237-44e7-a15f-a5c3c5c88ffd',
              datagroup: 'EF_DG1',
              fid: 257,
              sha256Sum: 'qMw6kHOGa9lPJ5OVEfWeosawuPeIS1IWNwa8YOEQvfs=',
              size: 93,
            },
            {
              data: '/odata/v1/Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/file/240bb097-55b4-4901-b5ee-f38ed8144346',
              datagroup: 'EF_DG2',
              fid: 258,
              sha256Sum: '1Bmjs0XmfbO4kV+B47f686+/hfhJBm1eH93mkoTE6C4=',
              size: 18_576,
            },
            {
              data: '/odata/v1/Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/file/4863f4d8-7b79-4d89-94fc-813919394db4',
              datagroup: 'EF_SOD',
              fid: 285,
              sha256Sum: 'iSwOF5oSwtkxLSjOvWlcXhc+HFsX/ETi8EwIHrnVmDo=',
              size: 1510,
            },
            {
              data: '/odata/v1/Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/file/5b73454b-688d-44e7-931b-c33c3ae22ef7',
              datagroup: 'EF_DG14',
              fid: 270,
              sha256Sum: 'qyR3GNlrKSLhQm+9w2LQNdH58bYSm4LrCxFUkY8GctA=',
              size: 371,
            },
            {
              data: '/odata/v1/Streams/6d3240ed-ae7c-4ef0-827c-a6d0cda7319d/file/eff744ef-764f-4e18-a41e-2f74a6619f7f',
              datagroup: 'EF_COM',
              fid: 286,
              sha256Sum: 'oiOXqL0RdtLo/Wo0/4CnOuFvHL3ajlV4ZqNDabhwmDg=',
              size: 23,
            },
          ],
          documentType: 'ICAO_MRTD',
          features: [],
          verificationStatus: {
            AA: 'NOT_PRESENT',
            AAReason: 'NOT_SUPPORTED',
            AAResult: undefined,
            CAResult: {
              encryptedResponseBytes: undefined,
              keyId: undefined,
              oid: '0.4.0.127.0.7.2.2.3.2.1',
              pcdPrivateKeyBytes: undefined,
              pcdPublicKeyBytes: undefined,
            },
            certificateChain: ['MIIEFzCCA52gAwIBAg'],
            CS: 'PRESENT_SUCCEEDED',
            CSReason: 'FOUND_A_CHAIN_SUCCEEDED',
            DS: 'PRESENT_SUCCEEDED',
            DSReason: 'SIGNATURE_CHECKED',
            EACCA: 'PRESENT_SUCCEEDED',
            EACCAReason: 'SUCCEEDED',
            hashResults: [
              {
                computedHash: 'qMw6kHOGa9lPJ5OVEfWeosawuPeIS1IWNwa8YOEQvfs=',
                dataGroup: 1,
                storedHash: 'qMw6kHOGa9lPJ5OVEfWeosawuPeIS1IWNwa8YOEQvfs=',
              },
              {
                computedHash: '1Bmjs0XmfbO4kV+B47f686+/hfhJBm1eH93mkoTE6C4=',
                dataGroup: 2,
                storedHash: '1Bmjs0XmfbO4kV+B47f686+/hfhJBm1eH93mkoTE6C4=',
              },
              {
                computedHash: 'qyR3GNlrKSLhQm+9w2LQNdH58bYSm4LrCxFUkY8GctA=',
                dataGroup: 14,
                storedHash: 'qyR3GNlrKSLhQm+9w2LQNdH58bYSm4LrCxFUkY8GctA=',
              },
            ],
            HT: 'PRESENT_SUCCEEDED',
            HTReason: 'ALL_HASHES_MATCH',
          },
        },
        ocrSession: undefined,
        onfidoSession: undefined,
        opaqueId: undefined,
        readySession: {
          opaqueId: undefined,
          readySessionId: undefined,
        },
        serverVersion: '1.85.0',
        sessionId: '6d3240ed-ae7c-4ef0-827c-a6d0cda7319d',
        sessionType: 'STANDARD',
        veriffSession: undefined,
        viz: undefined,
        vizImages: {
          vizBack: undefined,
          vizCustom: undefined,
          vizFront: {
            captureMode: 'AUTOMATIC',
            description: 'Front of passport data page',
            features: {
              document: {
                coordinates: {
                  height: 1877,
                  width: 2904,
                  x: 116,
                  y: 51,
                },
                required: true,
                result: 'PASSED',
              },
              faceImage: {
                coordinates: {
                  height: 1076,
                  width: 837,
                  x: 250,
                  y: 277,
                },
                required: false,
                result: 'PASSED',
              },
              mrz: {
                coordinates: {
                  height: 216,
                  width: 2361,
                  x: 254,
                  y: 1554,
                },
                required: true,
                result: 'PASSED',
              },
              qrCode: {
                coordinates: undefined,
                required: false,
                result: 'PASSED',
              },
            },
            image: {
              height: 1929,
              mimeType: 'image/jpeg',
              sha256Sum: '4in+SCWHrG+idCbkwocCWoClUGH2/BW7kFOQ5+NxcQM=',
              url: undefined,
              width: 3021,
            },
            ocrSession: {
              mrz: 'P<GBROTHER<FORTYFOUR<<ANNA<NICHOLA<<<<<<<<<<\n5493647835GBR6001010F2708012<<<<<<<<<<<<<<02',
              mrzType: 'TD3',
            },
            qrCodeSession: undefined,
            qualityCriteria: {
              noFinger: {
                required: false,
                result: 'PASSED',
              },
              noGlare: {
                required: false,
                result: 'PASSED',
              },
              sharpImage: {
                required: false,
                result: 'PASSED',
              },
            },
          },
        },
        vizSession: undefined,
      },
    },
  ],
  claimedIdentityVCS: [
    {
      sub: '',
      nbf: 1_647_017_990,
      iss: 'https://review-c.build.account.gov.uk',
      iat: 1_647_017_990,
      jti: 'urn:uuid:11111111-1111-1111-1111-111111111111',
      vc: {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://vocab.account.gov.uk/contexts/identity-v1.jsonld',
        ],
        type: ['VerifiableCredential', 'IdentityAssertionCredential'],
        credentialSubject: {
          name: [
            {
              nameParts: [
                {
                  value: 'Alice',
                  type: 'GivenName',
                },
                {
                  value: 'Jane',
                  type: 'GivenName',
                },
                {
                  value: 'Laura',
                  type: 'GivenName',
                },
                {
                  value: 'Doe',
                  type: 'FamilyName',
                },
              ],
            },
          ],
          birthDate: [
            {
              value: '1970-01-01',
            },
          ],
        },
      },
    },
  ],
  face2faceVCS: [
    {
      sub: '',
      nbf: 1_685_488_860,
      iss: 'https://review-o.dev.account.gov.uk',
      iat: 1_685_488_860,
      vc: {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://vocab.account.gov.uk/contexts/identity-v1.jsonld',
        ],
        type: ['VerifiableCredential', 'IdentityCheckCredential'],
        credentialSubject: {
          name: [
            {
              nameParts: [
                {
                  value: 'ANGELA',
                  type: 'GivenName',
                },
                {
                  value: 'ZOE',
                  type: 'GivenName',
                },
                {
                  value: 'UK SPECIMEN',
                  type: 'FamilyName',
                },
              ],
            },
          ],
          birthDate: [
            {
              value: '1988-12-04',
            },
          ],
          passport: [
            {
              documentNumber: '533401372',
              expiryDate: '2025-09-28',
              icaoIssuerCode: 'GBR',
            },
          ],
        },
        evidence: [
          {
            type: 'IdentityCheck',
            strengthScore: 3,
            validityScore: 2,
            verificationScore: 3,
            txn: '435d4dab-2cb5-4591-a030-07b373660001',
            checkDetails: [
              {
                checkMethod: 'vri',
                identityCheckPolicy: 'published',
              },
              {
                checkMethod: 'pvr',
                photoVerificationProcessLevel: 3,
              },
            ],
          },
        ],
      },
    },
  ],
};
