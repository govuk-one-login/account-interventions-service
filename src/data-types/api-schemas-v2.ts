import { InterventionName } from './intervention-name';
import './zod-setup';
import z from 'zod';

const InterventionNameSchema = z
  .enum(InterventionName)
  .openapi('InterventionName', { description: 'Enum of possible Intervention names' });

const InterventionSchema = z
  .object({
    name: z.union([z.string(), InterventionNameSchema]).openapi({ example: InterventionName.RESET_PASSWORD }),
  })
  .openapi('Intervention', {
    title: 'Intervention Schema',
    description: 'Details about an intervention applied to an account',
  });

const InterventionsListSchema = z.array(InterventionSchema).openapi('InterventionsList', {
  title: 'Interventions List',
  description: 'List of interventions applied to an account',
  example: [{ name: 'RESET_PASSWORD' }, { name: 'REPROVE_IDENTITY' }],
  readOnly: true,
});

export const V2ResponseSchema = z
  .object({
    interventions: InterventionsListSchema,
  })
  .openapi('AccountStatusResponse', {
    title: 'Account Status Schema',
    description: "The Status of the User's OneLogin Account",
    readOnly: true,
  });

export type V2Response = z.infer<typeof V2ResponseSchema>;
