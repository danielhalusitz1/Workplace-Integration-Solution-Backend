import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';
import {
  createMockRequest,
  createMockResponse,
  ExternalAccountTestProvider,
  SessionTestProvider,
  setupMongoTestLifecycle,
  UserSettingsTestProvider,
  UserTestProvider,
} from 'src/test';
import { UserDTO } from 'src/user/dto/user.dto';

import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth-google.service';
import { AuthMicrosoftService } from './auth-microsoft.service';

describe('AuthService', () => {
  const mockAuthGoogleService = {
    getAuthUrl: jest.fn(),
    login: jest.fn(),
  };

  const mockAuthMicrosoftService = {
    getAuthUrl: jest.fn(),
    login: jest.fn(),
  };

  const ctx = setupMongoTestLifecycle({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      JwtModule.register({ secret: process.env.JWT_SECRET_KEY }),
    ],
    providers: [
      AuthService,
      { provide: AuthGoogleService, useValue: mockAuthGoogleService },
      { provide: AuthMicrosoftService, useValue: mockAuthMicrosoftService },
    ],
  });

  let authService: AuthService;
  let userTestProvider: UserTestProvider;
  let userSettingsTestProvider: UserSettingsTestProvider;
  let externalAccountTestProvider: ExternalAccountTestProvider;
  let sessionTestProvider: SessionTestProvider;

  beforeEach(() => {
    authService = ctx.module.get(AuthService);
    userTestProvider = ctx.module.get(UserTestProvider);
    userSettingsTestProvider = ctx.module.get(UserSettingsTestProvider);
    externalAccountTestProvider = ctx.module.get(ExternalAccountTestProvider);
    sessionTestProvider = ctx.module.get(SessionTestProvider);
    jest.clearAllMocks();
  });

  it('creates user, settings, external account, and session on first Google login', async () => {
    const foreignId = 'google-user-123';
    const email = 'newuser@example.com';

    mockAuthGoogleService.login.mockResolvedValue({
      id: foreignId,
      email,
      firstName: 'Jane',
      lastName: 'Doe',
      refreshToken: 'google-refresh-token',
      accessToken: 'google-access-token',
      expiryDate: Date.now() + 60 * 60 * 1000,
    });

    const res = createMockResponse();

    await authService.googleAuthCallback(
      { code: 'auth-code', state: 'oauth-state' },
      createMockRequest({ google_auth_state: 'oauth-state' }),
      res,
    );

    const externalAccount =
      await externalAccountTestProvider.findByForeignId(foreignId);
    expect(externalAccount).not.toBeNull();
    expect(externalAccount?.email).toBe(email);
    expect(externalAccount?.type).toBe(ExternalAccountType.GOOGLE);

    const user = await userTestProvider.findById(externalAccount!.userId);
    expect(user?.firstName).toBe('Jane');
    expect(user?.lastName).toBe('Doe');

    const settings = await userSettingsTestProvider.findByUserId(
      externalAccount!.userId,
    );
    expect(settings?.googleConnected).toBe(true);

    const sessions = await sessionTestProvider.findByUserId(
      externalAccount!.userId,
    );
    expect(sessions).toHaveLength(1);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
  });

  it('returns the active session for a valid access token', async () => {
    const user = await userTestProvider.create();
    const session = await sessionTestProvider.create({
      userId: user._id.toString(),
      accessToken: 'active-access-token',
      accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const active = await authService.getActiveSession({
      userId: user._id.toString(),
      accessToken: session.accessToken,
    });

    expect(active).not.toBeNull();
    expect(active?._id.toString()).toBe(session._id.toString());
  });

  it('deletes the current session on logout', async () => {
    const user = await userTestProvider.create();
    const refreshToken = 'logout-refresh-token';

    await sessionTestProvider.create({
      userId: user._id.toString(),
      refreshToken,
    });

    const res = createMockResponse();
    const userDTO = plainToInstance(UserDTO, user, {
      excludeExtraneousValues: true,
    });

    await authService.logout({
      user: userDTO,
      req: createMockRequest({ 'refresh-token': refreshToken }),
      res,
    });

    const sessions = await sessionTestProvider.findByUserId(
      user._id.toString(),
    );
    expect(sessions).toHaveLength(0);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('deletes all sessions on logout everywhere', async () => {
    const user = await userTestProvider.create();

    await sessionTestProvider.create({ userId: user._id.toString() });
    await sessionTestProvider.create({ userId: user._id.toString() });

    const res = createMockResponse();
    const userDTO = plainToInstance(UserDTO, user, {
      excludeExtraneousValues: true,
    });

    await authService.logoutEverywhere({ user: userDTO, res });

    const sessions = await sessionTestProvider.findByUserId(
      user._id.toString(),
    );
    expect(sessions).toHaveLength(0);
  });

  it('redirects to web base when Google login returns no access token', async () => {
    mockAuthGoogleService.login.mockResolvedValue({
      id: 'google-user-123',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      refreshToken: 'google-refresh-token',
      accessToken: undefined,
      expiryDate: Date.now() + 60 * 60 * 1000,
    });

    const res = createMockResponse();

    await authService.googleAuthCallback(
      { code: 'auth-code', state: 'oauth-state' },
      createMockRequest({ google_auth_state: 'oauth-state' }),
      res,
    );

    expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
  });
});
