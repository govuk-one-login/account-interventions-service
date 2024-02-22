export const host = 'localhost';
export const port = 8080;
export const jsonUrl =
  '/Users/lquayle/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/newProject/account-interventions-service/pacts/AIS TS Client-Account Intervention Service.json';

export const accountIsBlocked = {
  intervention: {
    updatedAt: 123_455,
    appliedAt: 12_345_685_809,
    sentAt: 123_456_789,
    description: 'AIS_ACCOUNT_BLOCKED',
  },
  state: {
    blocked: true,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
};

export const accountNotFound = {
  intervention: {
    updatedAt: 1_685_404_800_000,
    appliedAt: 1_685_404_800_000,
    sentAt: 1_685_404_800_000,
    description: 'AIS_NO_INTERVENTION',
  },
  state: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
};

export const accountHasNoIntervention = {
  intervention: {
    updatedAt: 123_455,
    appliedAt: 12_345_685_809,
    sentAt: 123_456_789,
    description: 'AIS_NO_INTERVENTION',
    reprovedIdentityAt: 849_473,
    resetPasswordAt: 5_847_392,
  },
  state: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
};

export interface ResponseFromApiClient {
  status: number;
  message: string;
  payload: object;
}
