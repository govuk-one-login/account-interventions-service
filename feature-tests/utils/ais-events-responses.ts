export const aisEventRepsonse = {
  pswResetRequired: {
    description: 'AIS_FORCED_USER_PASSWORD_RESET',
    blocked: false,
    suspended: true,
    resetPassword: true,
    reproveIdentity: false,
    interventionCodeHistory: '04',
    componentHistory: 'TICF_CRI',
    interventionHistory: 'FRAUD_FORCED_USER_PASSWORD_RESET',
    reason: 'password reset - 04',
    auditLevel: 'standard',
  },

  suspendNoAction: {
    description: 'AIS_ACCOUNT_SUSPENDED',
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: false,
    interventionCodeHistory: '01',
    componentHistory: 'TICF_CRI',
    interventionHistory: 'FRAUD_SUSPEND_ACCOUNT',
    reason: 'suspend - 01',
    auditLevel: 'standard',
  },

  block: {
    description: 'AIS_ACCOUNT_BLOCKED',
    blocked: true,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
    interventionCodeHistory: '03',
    componentHistory: 'TICF_CRI',
    interventionHistory: 'FRAUD_BLOCK_ACCOUNT',
    reason: 'block - 03',
    auditLevel: 'standard',
  },

  idResetRequired: {
    description: 'AIS_FORCED_USER_IDENTITY_VERIFY',
    blocked: false,
    suspended: true,
    resetPassword: false,
    reproveIdentity: true,
    interventionCodeHistory: '05',
    componentHistory: 'TICF_CRI',
    interventionHistory: 'FRAUD_FORCED_USER_IDENTITY_REVERIFICATION',
    reason: 'id reset - 05',
    auditLevel: 'standard',
  },

  pswAndIdResetRequired: {
    description: 'AIS_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_VERIFY',
    blocked: false,
    suspended: true,
    resetPassword: true,
    reproveIdentity: true,
    interventionCodeHistory: '06',
    componentHistory: 'TICF_CRI',
    interventionHistory: 'FRAUD_FORCED_USER_PASSWORD_RESET_AND_IDENTITY_REVERIFICATION',
    reason: 'password and id reset - 06',
    auditLevel: 'standard',
  },

  unblock: {
    description: 'AIS_ACCOUNT_UNBLOCKED',
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
    interventionCodeHistory: '07',
    componentHistory: 'TICF_CRI',
    interventionHistory: 'FRAUD_UNBLOCK_ACCOUNT',
    reason: 'unblock - 07',
    auditLevel: 'standard',
  },

  userActionIdResetSuccess: {
    description: 'AIS_NO_INTERVENTION',
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
    interventionCodeHistory: '',
    componentHistory: 'TICF_CRI',
    interventionHistory: '',
    reason: '',
    auditLevel: 'standard',
  },

  userActionPswResetSuccess: {
    description: 'AIS_NO_INTERVENTION',
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
    interventionCodeHistory: '',
    componentHistory: 'TICF_CRI',
    interventionHistory: '',
    reason: '',
    auditLevel: 'standard',
  },

  unSuspendAction: {
    description: 'AIS_ACCOUNT_UNSUSPENDED',
    blocked: false,
    suspended: false,
    resetPassword: false,
    reproveIdentity: false,
    interventionCodeHistory: '02',
    componentHistory: 'TICF_CRI',
    interventionHistory: 'FRAUD_UNSUSPEND_ACCOUNT',
    reason: 'unsuspend - 02',
    auditLevel: 'standard',
  },
};
