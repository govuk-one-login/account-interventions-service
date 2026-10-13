import type { Events } from '@govuk-one-login/event-catalogue';

// using .mts forces NodeNext module resolution, which requires every
// imported subpath to be explicitly declared in a package's exports map — and since
// @govuk-one-login/event-catalogue has no exports
// InterventionStateEnum isn't exposed via the package's root Events type (it's a sibling
// export in AIS_EVENT_TRANSITION_APPLIED.d.ts, not nested under the event itself), so it's
// derived from the `state` field on the event's extensions instead of a deep subpath import.
type InterventionStateEnum = NonNullable<NonNullable<Events['AIS_EVENT_TRANSITION_APPLIED']['extensions']>['state']>;

/**
 * AIS Event Ignored Stale
 */
export interface AIS_EVENT_IGNORED_STALE { //NOSONAR
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
  trigger_event_id: string | undefined;
  trigger_event: string;
  intervention_code?: string;
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
