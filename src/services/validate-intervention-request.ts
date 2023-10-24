import { InterventionRequest } from '../data-types/interfaces';

export function validateInterventionRequest(interventionRequest: InterventionRequest): boolean {
  if (!interventionRequest.timestamp || Number.isNaN(interventionRequest.timestamp)) return false;
  if (!interventionRequest.user?.user_id) return false;
  if (
    !interventionRequest.extension?.intervention ||
    interventionRequest.extension?.intervention.intervention_code ||
    interventionRequest.extension?.intervention.intervention_reason
  )
    return false;
  return true;
}
