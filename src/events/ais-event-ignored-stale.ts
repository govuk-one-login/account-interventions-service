import { InterventionStateEnum } from '@govuk-one-login/event-catalogue/AIS_EVENT_TRANSITION_APPLIED';

/**
 * AIS Event Ignored Stale
 */
export interface AIS_EVENT_IGNORED_STALE {
  /**
   * Links the transaction to the client (Relying Party) that initiated the journey.
   *
   */
  client_id?: string;
  /**
   * The component part of the DI system that has generated the event.
   *
   */
  component_id: string;
  /**
   * A short name, in UPPER_SNAKE format, for the event that has taken place in the system
   *
   */
  event_name: string;
  /**
   * Records the time and date of when the event occurred. This should be a UTC timestamp and be recorded to the nearest millisecond.
   *
   */
  event_timestamp_ms: number;
  extensions?: AisEventIgnoredStaleExtensions | AisEventIgnoredStaleBasicExtensions;
  /**
   * Records the time and date of when the event occurred. This should be a UTC timestamp and be recorded to the nearest second.
   *
   */
  timestamp: number;
  user?: AisEventTransitionAppliedUser;
}
export interface AisEventIgnoredStaleExtensions extends AisEventIgnoredStaleBasicExtensions {
  description?: string;
  allowable_interventions: InterventionCodeEnum[];
  state?: InterventionStateEnum;
  action?: string;
}
export interface AisEventIgnoredStaleBasicExtensions {
  trigger_event_id: string;
  trigger_event: string;
  intervention_code?: InterventionCodeEnum;
}
/**
 * This interface was referenced by `AIS_EVENT_TRANSITION_APPLIED`'s JSON-Schema
 * via the `definition` "AisEventTransitionAppliedUser".
 */
export interface AisEventTransitionAppliedUser {
  /**
   * This is the CommonSubjectID (i.e. the internal version of the pairwiseid) of the user in the relevant part of the system.
   *
   */
  user_id?: string;
}
export type InterventionCodeEnum =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '90'
  | '91'
  | '92'
  | '93'
  | '94'
  | '95';
