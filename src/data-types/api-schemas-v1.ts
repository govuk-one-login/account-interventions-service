import z from 'zod';
import { AISInterventionTypes } from './constants';

const InterventionMetadataSchema = z
  .object({
    updatedAt: z.number().int().meta({
      description: 'A timestamp (ms) when the status was last updated to the database.',
      example: 1_696_969_322_935,
      format: 'int64',
    }),
    appliedAt: z.number().int().meta({
      description: "A timestamp (ms) when the Intervention was Applied to the User's Account.",
      example: 1_696_869_005_821,
      format: 'int64',
    }),
    sentAt: z.number().int().meta({
      description: 'A timestamp (ms) when the Intervention was sent by Fraud Analyst/Risk Engine.',
      example: 1696869003456,
      format: 'int64',
    }),
    description: z.enum(AISInterventionTypes).meta({
      description: 'The specific intervention currently applied to the account.',
      example: AISInterventionTypes.AIS_ACCOUNT_UNSUSPENDED,
    }),
    reprovedIdentityAt: z.number().int().optional().meta({
      description:
        'A timestamp (ms) of when the User performed the reprove identity action to unsuspend their account.',
      example: 1_696_969_322_935,
      format: 'int64',
    }),
    resetPasswordAt: z.number().int().optional().meta({
      description: 'A timestamp (ms) of when the User performed the password reset action to unsuspend their account.',
      example: 1_696_875_903_456,
      format: 'int64',
    }),
    accountDeletedAt: z.number().int().optional().meta({
      description: 'A timestamp (ms) of when the account was deleted.',
      example: 1_696_969_359_935,
      format: 'int64',
    }),
  })
  .meta({
    id: 'InterventionMetadata',
    title: 'Intervention Metadata Schema',
    description: 'Information about the current intervention',
    readOnly: true,
  });

const AccountStateSchema = z
  .object({
    blocked: z.boolean().meta({
      example: false,
      description:
        'Indicates that the Account is **BLOCKED** and therefore permanently suspended.\n**N.B.** Overrides any other AccountState attributes.\nIf this value is `true` the user should be completely **BLOCKED** from accessing their account\nand is normally never expected to regain access.',
    }),
    suspended: z.boolean().meta({
      example: false,
      description:
        'Indicates that the Account is **SUSPENDED**.\n- If this value is `true` but `reproveIdentity` **AND** `resetPassword` are both set to `false` then the\nAccount is **SUSPENDED** and does NOT require the User to perform any actions.\n- If this value is `true` but `reproveIdentity` **OR** `resetPassword` is `true` then the Account\nis **SUSPENDED** and requires the User to perform an action to unsuspend their account.\n- If this value is `true` but `reproveIdentity` **AND** `resetPassword` are `true` then the Account\nis **SUSPENDED** and requires the User to perform multiple actions to unsuspend their account.',
    }),
    reproveIdentity: z.boolean().meta({
      example: false,
      description:
        'Indicates that the Account is **SUSPENDED** and requires the User to reprove their identity as a\nprerequisite to being able to regain access to their account.',
    }),
    resetPassword: z.boolean().meta({
      example: false,
      description:
        'Indicates that the Account is **SUSPENDED** and requires the User to reset their password as a\nprerequisite to being able to regain access to their account.',
    }),
  })
  .meta({
    id: 'AccountState',
    title: 'Account State Schema',
    description: "Current state of the User's Account and whether user actions have been requested",
    readOnly: true,
  });

const HistoryObjectSchema = z
  .object({
    sentAt: z.string().meta({
      example: '2023-10-10T20:22:02.925Z',
      description:
        'timestamp in ISO String format of when the intervention event was sent by the originating component',
    }),
    component: z
      .string()
      .meta({ example: 'TICF_CRI', description: 'the name of the component that generated the intervention' }),
    code: z.string().meta({ example: '01', description: 'the numeric code associated with the intervention' }),
    intervention: z.string().meta({
      example: 'FRAUD_SUSPEND_ACCOUNT',
      description: 'the name of the intervention corresponding to the code',
    }),
    reason: z.string().meta({
      example: 'a reason for the intervention',
      description: 'the reason field from the original intervention event',
    }),
    originatingComponent: z
      .string()
      .optional()
      .meta({ example: 'CMS', description: 'the name of the component that originated the intervention event' }),
    originatorReferenceId: z.string().optional().meta({
      example: '12345',
      description: 'the numeric code identifying the case that triggered the intervention',
    }),
    requesterId: z
      .string()
      .optional()
      .meta({ example: '12345', description: 'opaque id of the user that requested the intervention (no PII)' }),
  })
  .meta({
    id: 'HistoryObject',
    title: 'Past intervention object',
    description: 'JSON object representing an intervention previously applied on the account',
    readOnly: true,
  });

const AuditLevelSchema = z.enum(['standard', 'enhanced']).default('standard').meta({
  id: 'AuditLevel',
  title: 'Audit Level Schema',
  description: 'Indicates if normal or enhanced downstream auditing is required for this account',
  example: 'standard',
});

export const V1ResponseSchema = z
  .object({
    intervention: InterventionMetadataSchema,
    state: AccountStateSchema,
    auditLevel: AuditLevelSchema,
    history: z.array(HistoryObjectSchema).optional().meta({
      id: 'HistoryList',
      title: 'Intervention history',
      description: 'History of intervention applied to this account',
    }),
  })
  .meta({
    id: 'InterventionStatusResponse',
    title: 'Account Intervention Status Schema',
    description: "The Intervention Status of the User's OneLogin Account",
    readOnly: true,
  });

export type V1Response = z.infer<typeof V1ResponseSchema>;
