import {
  defaultUserSettingsCreate,
  setupMongoTestLifecycle,
  UserSettingsTestProvider,
} from 'src/test';

import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  const ctx = setupMongoTestLifecycle();

  let userSettingsService: UserSettingsService;
  let userSettingsTestProvider: UserSettingsTestProvider;

  beforeEach(() => {
    userSettingsService = ctx.module.get(UserSettingsService);
    userSettingsTestProvider = ctx.module.get(UserSettingsTestProvider);
  });

  it('persists user settings in MongoDB', async () => {
    const payload = defaultUserSettingsCreate({
      googleConnected: true,
      microsoftConnected: false,
    });

    const created = await userSettingsService.create(payload);

    expect(created.googleConnected).toBe(true);
    expect(created.userId).toBe(payload.userId);

    const stored = await userSettingsTestProvider.findByUserId(payload.userId);
    expect(stored).not.toBeNull();
    expect(stored?.googleConnected).toBe(true);
  });
});
