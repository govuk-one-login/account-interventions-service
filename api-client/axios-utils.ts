export const host = 'localhost';
export const port = 8080;

export const accountIsBlocked = {
  intervention: {
    updatedAt: 123455,
    appliedAt: 12345685809,
    sentAt: 123456789,
    description: 'AIS_ACCOUNT_BLOCKED',
    reprovedIdentityAt: 849473,
    resetPasswordAt: 5847392,
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
    updatedAt: 1685404800000,
    appliedAt: 1685404800000,
    sentAt: 1685404800000,
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

export const accountIsNotSuspended = {
  intervention: {
    updatedAt: 123455,
    appliedAt: 12345685809,
    sentAt: 123456789,
    description: 'AIS_NO_INTERVENTION',
    reprovedIdentityAt: 849473,
    resetPasswordAt: 5847392,
  },
  state: {
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
  },
  auditLevel: 'standard',
};
