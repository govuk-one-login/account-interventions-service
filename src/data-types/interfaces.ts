export interface StateDetails {
  blocked: boolean;
  suspended: boolean;
  resetPassword: boolean;
  reproveIdentity: boolean;
}

export interface CurrentTimeDescriptor {
  isoString: string;
  milliseconds: number;
  seconds: number;
}

export interface InterventionRequest {
  event_name: string;
  timestamp: number;
  component_id: string;
  user: User;
  extension: Extension;
}

interface User {
  user_id: string;
}

interface Extension {
  intervention: Intervention;
}

interface Intervention {
  intervention_code: string;
  intervention_reason: string;
  cms_id?: string;
  requester_id?: string;
  audit_level?: string;
}
