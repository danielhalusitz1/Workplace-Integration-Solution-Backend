import {
  SessionTestProvider,
  setupMongoTestLifecycle,
  UserTestProvider,
} from 'src/test';

import { SessionService } from './session.service';

describe('SessionService', () => {
  const ctx = setupMongoTestLifecycle();

  let sessionService: SessionService;
  let sessionTestProvider: SessionTestProvider;
  let userTestProvider: UserTestProvider;

  beforeEach(() => {
    sessionService = ctx.module.get(SessionService);
    sessionTestProvider = ctx.module.get(SessionTestProvider);
    userTestProvider = ctx.module.get(UserTestProvider);
  });

  describe('getActiveSession', () => {
    it('returns an active session when the access token has not expired', async () => {
      const user = await userTestProvider.create();
      const session = await sessionTestProvider.create({
        userId: user._id.toString(),
        accessToken: 'active-access-token',
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const active = await sessionService.getActiveSession({
        userId: user._id.toString(),
        accessToken: session.accessToken,
      });

      expect(active).not.toBeNull();
      expect(active?._id.toString()).toBe(session._id.toString());
    });

    it('returns null when the access token has expired', async () => {
      const user = await userTestProvider.create();
      const session = await sessionTestProvider.create({
        userId: user._id.toString(),
        accessToken: 'expired-access-token',
        accessExpiresAt: new Date(Date.now() - 1000),
      });

      const active = await sessionService.getActiveSession({
        userId: user._id.toString(),
        accessToken: session.accessToken,
      });

      expect(active).toBeNull();
    });

    it('returns null when the access token does not match', async () => {
      const user = await userTestProvider.create();
      await sessionTestProvider.create({
        userId: user._id.toString(),
        accessToken: 'stored-access-token',
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const active = await sessionService.getActiveSession({
        userId: user._id.toString(),
        accessToken: 'different-access-token',
      });

      expect(active).toBeNull();
    });
  });
});
