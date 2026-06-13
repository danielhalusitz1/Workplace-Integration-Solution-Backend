export enum ErrorTypes {
  RECONNECT_REQUIRED = 'error.reconnect-required',
  CONNECTION_FAILED = 'error.connection-failed',
  RELOG_REQUIRED = 'error.relog-required',
  LOGIN_FAILED = 'error.login-failed',

  EMAIL_GOOGLE_SYNC_SERVICE_START_WATCHING_JOBS_EXTERNAL_ACCOUNT_NOT_FOUND = 'error.email-google-sync-service.start-watching-jobs.external-account-not-found',
  EMAIL_GOOGLE_SYNC_SERVICE_START_WATCHING_JOBS_WATCH_RESPONSE_MISSING_DATA = 'error.email-google-sync-service.start-watching-jobs.watch-response.missing-data',

  EXTERNAL_ACCOUNT_SERVICE_DELETE_NOT_SUCCESS = 'error.external-account-service.delete.not-success',
  EXTERNAL_ACCOUNT_SERVICE_DELETE_IS_PRIMARY = 'error.external-account-service.delete.is-primary',
  EXTERNAL_ACCOUNT_SERVICE_CONNECT_USER_ID_MISMATCH = 'error.external-account-service.connect.user-id-mismatch',
  EXTERNAL_ACCOUNT_SERVICE_CONNECT_MISSING_REFRESH_TOKEN = 'error.external-account-service.connect.missing-refresh-token',
  EXTERNAL_ACCOUNT_SERVICE_CONNECT_NOT_SUCCESS = 'error.external-account-service.connect.not-success',
  EXTERNAL_ACCOUNT_SERVICE_VALIDATE_CONNECTION_LIMIT_LIMIT_REACHED = 'error.external-account-service.validate-connection-limit.limit-reached',
  EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_BANNED = 'error.external-account-service.connect.account-banned',
  EXTERNAL_ACCOUNT_SERVICE_SET_PRIMARY_ACCOUNT_NOT_FOUND = 'error.external-account-service.set-primary-account.not-found',

  USER_SETTINGS_SERVICE_GET_BY_USER_ID_NOT_FOUND = 'error.user-settings-service.get-by-user-id.not-found',
  USER_SETTINGS_SERVICE_UPDATE_NOT_SUCCESS = 'error.user-settings-service.update.not-success',
  USER_SETTINGS_SERVICE_UPDATE_PRIMARY_EXTERNAL_ACCOUNT_SETTING_NOT_FOUND = 'error.user-settings-service.update-primary-external-account-setting.not-found',

  USER_SUBSCRIPTION_SERVICE_GET_BY_USER_ID_NOT_FOUND = 'error.user-subscription-service.get-by-user-id.not-found',

  SESSION_SERVICE_UPDATE_NOT_SUCCESS = 'error.session-service.update.not-success',
}
