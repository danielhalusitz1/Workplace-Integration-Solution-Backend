export { ExternalAccountTestProvider } from './external-account-test.provider';
export { SessionTestProvider } from './session-test.provider';
export { UserSettingsTestProvider } from './user-settings-test.provider';
export { UserSubscriptionTestProvider } from './user-subscription-test.provider';
export { UserTestProvider } from './user-test.provider';

import { ExternalAccountTestProvider } from './external-account-test.provider';
import { SessionTestProvider } from './session-test.provider';
import { UserSettingsTestProvider } from './user-settings-test.provider';
import { UserSubscriptionTestProvider } from './user-subscription-test.provider';
import { UserTestProvider } from './user-test.provider';

export const schemaTestProviders = [
  UserTestProvider,
  UserSettingsTestProvider,
  UserSubscriptionTestProvider,
  SessionTestProvider,
  ExternalAccountTestProvider,
] as const;
