import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const UserIdParamSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(/^[^,\s]+$/)
    .openapi({
      param: { name: 'userId', in: 'path', example: 'urn:fdc:gov.uk:2022:JG0RJI1pYbnanbvPs-j4j5-a-PFcmhry9Qu9NCEp5d4' },
      description:
        'An internal DI subject identifier. See [ADR-0061](https://github.com/govuk-one-login/architecture/blob/RFC_identity_inheritance/adr/0061-common-subject-identifier-for-internal-DI-functions.md#internal-di-functions-to-use-subjectid) which refers to the `SubjectId` described in [ADR-0024](https://github.com/govuk-one-login/architecture/blob/RFC_identity_inheritance/adr/0024-user-identifiers.md#decision) which follows the format defined in [RFC-0027](https://github.com/govuk-one-login/architecture/blob/RFC_identity_inheritance/rfc/0027-subject-identifier-format.md).',
    }),
});

export const V1QuerySchema = z.object({
  history: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .openapi({
      description: "A flag to enable the recall of the account's previous intervention history.",
      param: { name: 'history', in: 'query', example: true },
    }),
});
