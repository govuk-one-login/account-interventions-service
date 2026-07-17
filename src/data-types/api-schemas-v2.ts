/* istanbul ignore file */
import z from 'zod';
import { InterventionName } from './intervention-name';
import { InterventionState } from './constants';

const InterventionNameSchema = z
  .enum(InterventionName)
  .meta({ id: 'InterventionName', description: 'Enum of possible Intervention names' });

const InterventionSchema = z
  .object({
    name: z.union([z.string(), InterventionNameSchema]).meta({ example: InterventionName.RESET_PASSWORD }),
  })
  .meta({
    id: 'Intervention',
    title: 'Intervention Schema',
    description: 'Details about an intervention applied to an account',
  });

const InterventionsListSchema = z.array(InterventionSchema).meta({
  id: 'InterventionsList',
  title: 'Interventions List',
  description: 'List of interventions applied to an account',
  example: [{ name: 'RESET_PASSWORD' }, { name: 'REPROVE_IDENTITY' }],
  readOnly: true,
});

export const V2ResponseSchema = z
  .object({
    interventions: InterventionsListSchema,
  })
  .meta({
    id: 'AccountStatusResponse',
    title: 'Account Status Schema',
    description: "The Status of the User's OneLogin Account",
    readOnly: true,
  });

export type V2Response = z.infer<typeof V2ResponseSchema>;

/* eslint-disable unicorn/max-nested-calls */
const HistoryObjectSchema = z
  .object({
    sentAt: z.number().int().meta({
      description: 'A timestamp (ms) when the Intervention was sent by Fraud Analyst/Risk Engine.',
      example: 1696869003456,
      format: 'int64',
    }),
    componentId: z.string().meta({ example: 'TICF_CRI' }),
    interventionName: z.enum(InterventionName),
    interventionState: z.enum(InterventionState),
    interventionCode: z.string().optional().meta({ example: '01' }),
    interventionReason: z.string().meta({ example: 'FRAUD_SUSPEND_ACCOUNT' }),
    originatingComponent: z.string().optional().meta({ example: 'CMS' }),
    originatorReferenceId: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .meta({ example: '12345' }),
    requesterId: z.string().optional().meta({ example: '12345' }),
    transactionId: z.string().optional(),
    messageEventId: z.string().optional(),
    tagId: z.string().optional(),
  })
  .meta({
    id: 'HistoryObject',
    title: 'History Object Schema',
    description: 'JSON object representing an intervention previously applied on the account',
    readOnly: true,
  });

export type HistoryObject = z.infer<typeof HistoryObjectSchema>;

const HistoryListSchema = z.array(HistoryObjectSchema).meta({
  id: 'HistoryList',
  title: 'History List',
  description: 'History of interventions applied to an account',
  readOnly: true,
});

export const V2HistoryResponseSchema = z
  .object({
    history: HistoryListSchema,
  })
  .meta({
    id: 'AccountHistoryResponse',
    title: 'Account History Schema',
    description: "The intervention history of the User's OneLogin Account",
    readOnly: true,
  });

export type V2HistoryResponse = z.infer<typeof V2HistoryResponseSchema>;
