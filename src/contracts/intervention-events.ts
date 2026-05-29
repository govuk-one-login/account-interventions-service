import { z } from 'zod';
import { EventsEnum, TriggerEventsEnum } from '../data-types/constants';

const baseInterventionMessageSchema = z.object({
  component_id: z.string(),
  event_id: z.string().optional(),
  event_name: z.string(),
  timestamp: z.number(),
  event_timestamp_ms: z.number(),
  user: z.object({
    user_id: z.string().trim().min(1, {
      message: 'String cannot be empty or just spaces',
    }),
  }),
});

const ticfAccountInterventionSchema = baseInterventionMessageSchema.safeExtend({
  event_name: z.literal(TriggerEventsEnum.TICF_ACCOUNT_INTERVENTION),
  extensions: z.object({
    intervention: z.object({
      intervention_code: z.string(),
      intervention_reason: z.string(),
      originating_component_id: z.string().optional(),
      originator_reference_id: z.string().optional(),
      requester_id: z.string().optional(),
    }),
  }),
});

export type TicfAccountIntervention = z.infer<typeof ticfAccountInterventionSchema>;

const authPasswordResetSuccessfulSchema = baseInterventionMessageSchema.safeExtend({
  event_name: z.literal(EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL),
});

export type AuthPasswordResetSuccessful = z.infer<typeof authPasswordResetSuccessfulSchema>;

const authPasswordResetSuccessfulForTestClientSchema = baseInterventionMessageSchema.safeExtend({
  event_name: z.literal(EventsEnum.AUTH_PASSWORD_RESET_SUCCESSFUL_FOR_TEST_CLIENT),
});

const ipvAccountInterventionEndSchema = baseInterventionMessageSchema.safeExtend({
  event_name: z.literal(EventsEnum.IPV_ACCOUNT_INTERVENTION_END),
  extensions: z.object({
    type: z.string().optional(),
    success: z.boolean().optional(),
  }),
});

export type IpvAccountInterventionEnd = z.infer<typeof ipvAccountInterventionEndSchema>;

export const interventionMessageSchema = z.union([
  ticfAccountInterventionSchema,
  ipvAccountInterventionEndSchema,
  authPasswordResetSuccessfulSchema,
  authPasswordResetSuccessfulForTestClientSchema,
]);

export type InterventionEventMessage = z.infer<typeof interventionMessageSchema>;
