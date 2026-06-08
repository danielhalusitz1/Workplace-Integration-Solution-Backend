export enum ErrorTypes {
  RECONNECT_REQUIRED = 'error.reconnect-required',
  CONNECTION_FAILED = 'error.connection-failed',
  RELOG_REQUIRED = 'error.relog-required',
  LOGIN_FAILED = 'error.login-failed',

  EXTERNAL_ACCOUNT_SERVICE_DELETE_NOT_SUCCESS = 'error.external-account-service.delete.not-success',
  EXTERNAL_ACCOUNT_SERVICE_DELETE_IS_PRIMARY = 'error.external-account-service.delete.is-primary',
  EXTERNAL_ACCOUNT_SERVICE_CREATE_EXTERNAL_ACCOUNT_PER_TYPE_LIMIT_REACHED = 'error.external-account-service.create.external-account-per-type-limit-reached',

  USER_SETTINGS_SERVICE_GET_BY_USER_ID_NOT_FOUND = 'error.user-settings-service.get-by-user-id.not-found',
  USER_SETTINGS_SERVICE_SAVE_NOT_SUCCESS = 'error.user-settings-service.save.not-success',

  USER_SUBSCRIPTION_SERVICE_GET_BY_USER_ID_NOT_FOUND = 'error.user-subscription-service.get-by-user-id.not-found',
}
