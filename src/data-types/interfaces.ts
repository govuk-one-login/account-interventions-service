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

export interface DeleteStatusUpdateSNSMessage {
  user_id: string;
}
