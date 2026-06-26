import z from 'zod';
import { InterventionName } from './intervention-name';

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
