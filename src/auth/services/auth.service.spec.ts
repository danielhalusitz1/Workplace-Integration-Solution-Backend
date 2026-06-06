import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { ErrorTypes } from 'src/enums/error-types.enum';
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
import { encrypt } from 'src/utils/encrypt';

import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth-google.service';
import { AuthMicrosoftService } from './auth-microsoft.service';

describe('AuthService', () => {
  beforeAll(() => {
    process.env.SKIP_OAUTH_STATE_CHECK = 'false';
  });

  const mockAuthGoogleService = {
    getAuthUrl: jest.fn(),
    getConnectionUrl: jest.fn(),
    login: jest.fn(),
  };

  const mockAuthMicrosoftService = {
    getAuthUrl: jest.fn(),
    getConnectionUrl: jest.fn(),
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

  const settingsUrl = `${process.env.WEB_BASE}/settings`;

  beforeEach(() => {
    authService = ctx.module.get(AuthService);
    userTestProvider = ctx.module.get(UserTestProvider);
    userSettingsTestProvider = ctx.module.get(UserSettingsTestProvider);
    externalAccountTestProvider = ctx.module.get(ExternalAccountTestProvider);
    sessionTestProvider = ctx.module.get(SessionTestProvider);
    jest.clearAllMocks();
  });

  describe('getGoogleAuthUrl', () => {
    it('delegates to AuthGoogleService', () => {
      const res = createMockResponse();
      mockAuthGoogleService.getAuthUrl.mockReturnValue(
        'https://accounts.google.com/o/oauth2/auth',
      );

      const url = authService.getGoogleAuthUrl({ res });

      expect(mockAuthGoogleService.getAuthUrl).toHaveBeenCalledWith({ res });
      expect(url).toBe('https://accounts.google.com/o/oauth2/auth');
    });
  });

  describe('getGoogleConnectionUrl', () => {
    it('delegates to AuthGoogleService', async () => {
      const res = createMockResponse();
      const user = plainToInstance(
        UserDTO,
        { _id: 'user-id' },
        {
          excludeExtraneousValues: true,
        },
      );
      mockAuthGoogleService.getConnectionUrl.mockReturnValue(
        'https://accounts.google.com/o/oauth2/connect',
      );

      const url = authService.getGoogleConnectionUrl({ user, res });

      expect(mockAuthGoogleService.getConnectionUrl).toHaveBeenCalledWith({
        user,
        res,
      });
      expect(url).toBe('https://accounts.google.com/o/oauth2/connect');
    });
  });

  describe('getMicrosoftAuthUrl', () => {
    it('delegates to AuthMicrosoftService', async () => {
      const res = createMockResponse();
      mockAuthMicrosoftService.getAuthUrl.mockResolvedValue(
        'https://login.microsoftonline.com/auth',
      );

      const url = await authService.getMicrosoftAuthUrl({ res });

      expect(mockAuthMicrosoftService.getAuthUrl).toHaveBeenCalledWith({ res });
      expect(url).toBe('https://login.microsoftonline.com/auth');
    });
  });

  describe('getMicrosoftConnectionUrl', () => {
    it('delegates to AuthMicrosoftService', async () => {
      const res = createMockResponse();
      const user = plainToInstance(
        UserDTO,
        { _id: 'user-id' },
        {
          excludeExtraneousValues: true,
        },
      );
      mockAuthMicrosoftService.getConnectionUrl.mockResolvedValue(
        'https://login.microsoftonline.com/connect',
      );

      const url = await authService.getMicrosoftConnectionUrl({ user, res });

      expect(mockAuthMicrosoftService.getConnectionUrl).toHaveBeenCalledWith({
        user,
        res,
      });
      expect(url).toBe('https://login.microsoftonline.com/connect');
    });
  });

  describe('googleAuthCallback', () => {
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
      expect(settings?.primaryExternalAccount).toBe(
        externalAccount!._id.toString(),
      );

      const sessions = await sessionTestProvider.findByUserId(
        externalAccount!.userId,
      );
      expect(sessions).toHaveLength(1);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
    });

    it('creates a session for a returning Google user without creating a new user', async () => {
      const foreignId = 'returning-google-user';
      const user = await userTestProvider.create({
        firstName: 'Existing',
        lastName: 'User',
      });

      await externalAccountTestProvider.create({
        userId: user._id.toString(),
        foreignId,
        type: ExternalAccountType.GOOGLE,
        email: 'existing@example.com',
      });

      mockAuthGoogleService.login.mockResolvedValue({
        id: foreignId,
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
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

      const accounts = await externalAccountTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(accounts).toHaveLength(1);

      const sessions = await sessionTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(sessions).toHaveLength(1);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
    });

    it('links a Google account when the user already has another provider with the same email', async () => {
      const user = await userTestProvider.create();
      const sharedEmail = 'shared@example.com';

      await externalAccountTestProvider.create({
        userId: user._id.toString(),
        foreignId: 'microsoft-foreign-id',
        type: ExternalAccountType.MICROSOFT,
        email: sharedEmail,
      });

      mockAuthGoogleService.login.mockResolvedValue({
        id: 'google-foreign-id',
        email: sharedEmail,
        firstName: 'Test',
        lastName: 'User',
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

      const accounts = await externalAccountTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(accounts).toHaveLength(2);
      expect(accounts.map((account) => account.type)).toEqual(
        expect.arrayContaining([
          ExternalAccountType.GOOGLE,
          ExternalAccountType.MICROSOFT,
        ]),
      );
      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
    });

    it('redirects to web base when oauth state does not match', async () => {
      const res = createMockResponse();

      await authService.googleAuthCallback(
        { code: 'auth-code', state: 'wrong-state' },
        createMockRequest({ google_auth_state: 'oauth-state' }),
        res,
      );

      expect(mockAuthGoogleService.login).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
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

  describe('microsoftAuthCallback', () => {
    it('creates user, settings, external account, and session on first Microsoft login', async () => {
      const foreignId = 'microsoft-user-123';
      const email = 'newuser@outlook.com';

      mockAuthMicrosoftService.login.mockResolvedValue({
        id: foreignId,
        email,
        firstName: 'John',
        lastName: 'Doe',
        refreshToken: 'ms-refresh-token',
        accessToken: 'ms-access-token',
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      const res = createMockResponse();

      await authService.microsoftAuthCallback(
        { code: 'auth-code', state: 'oauth-state' },
        createMockRequest({ microsoft_auth_state: 'oauth-state' }),
        res,
      );

      const externalAccount =
        await externalAccountTestProvider.findByForeignId(foreignId);
      expect(externalAccount).not.toBeNull();
      expect(externalAccount?.email).toBe(email);
      expect(externalAccount?.type).toBe(ExternalAccountType.MICROSOFT);

      const sessions = await sessionTestProvider.findByUserId(
        externalAccount!.userId,
      );
      expect(sessions).toHaveLength(1);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
    });

    it('creates a session for a returning Microsoft user without creating a new user', async () => {
      const foreignId = 'returning-microsoft-user';
      const user = await userTestProvider.create();

      await externalAccountTestProvider.create({
        userId: user._id.toString(),
        foreignId,
        type: ExternalAccountType.MICROSOFT,
        email: 'existing@outlook.com',
      });

      mockAuthMicrosoftService.login.mockResolvedValue({
        id: foreignId,
        email: 'existing@outlook.com',
        firstName: 'Existing',
        lastName: 'User',
        refreshToken: 'ms-refresh-token',
        accessToken: 'ms-access-token',
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      const res = createMockResponse();

      await authService.microsoftAuthCallback(
        { code: 'auth-code', state: 'oauth-state' },
        createMockRequest({ microsoft_auth_state: 'oauth-state' }),
        res,
      );

      const accounts = await externalAccountTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(accounts).toHaveLength(1);

      const sessions = await sessionTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(sessions).toHaveLength(1);
      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
    });

    it('redirects to web base when oauth state does not match', async () => {
      const res = createMockResponse();

      await authService.microsoftAuthCallback(
        { code: 'auth-code', state: 'wrong-state' },
        createMockRequest({ microsoft_auth_state: 'oauth-state' }),
        res,
      );

      expect(mockAuthMicrosoftService.login).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
    });

    it('redirects to web base when Microsoft login returns no access token', async () => {
      mockAuthMicrosoftService.login.mockResolvedValue({
        id: 'microsoft-user-123',
        email: 'user@outlook.com',
        firstName: 'Jane',
        lastName: 'Doe',
        refreshToken: 'ms-refresh-token',
        accessToken: undefined,
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      const res = createMockResponse();

      await authService.microsoftAuthCallback(
        { code: 'auth-code', state: 'oauth-state' },
        createMockRequest({ microsoft_auth_state: 'oauth-state' }),
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(process.env.WEB_BASE);
    });
  });

  describe('googleConnectionCallback', () => {
    it('links a Google account to an existing user', async () => {
      const user = await userTestProvider.create();
      const state = encrypt(user._id.toString());

      mockAuthGoogleService.login.mockResolvedValue({
        id: 'google-connect-id',
        email: 'connect@example.com',
        firstName: 'Connect',
        lastName: 'User',
        refreshToken: 'google-refresh-token',
        accessToken: 'google-access-token',
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      const res = createMockResponse();

      await authService.googleConnectionCallback(
        { code: 'auth-code', state },
        createMockRequest({ google_connection_state: state }),
        res,
      );

      const accounts = await externalAccountTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(accounts).toHaveLength(1);
      expect(accounts[0].type).toBe(ExternalAccountType.GOOGLE);
      expect(accounts[0].foreignId).toBe('google-connect-id');
      expect(res.redirect).toHaveBeenCalledWith(
        `${settingsUrl}?googleConnected=true`,
      );
    });

    it('redirects to settings with failure when oauth state does not match', async () => {
      const user = await userTestProvider.create();
      const state = encrypt(user._id.toString());
      const res = createMockResponse();

      await authService.googleConnectionCallback(
        { code: 'auth-code', state },
        createMockRequest({ google_connection_state: 'wrong-state' }),
        res,
      );

      expect(mockAuthGoogleService.login).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        `${settingsUrl}?googleConnected=false`,
      );
    });
  });

  describe('microsoftConnectionCallback', () => {
    it('links a Microsoft account to an existing user', async () => {
      const user = await userTestProvider.create();
      const state = encrypt(user._id.toString());

      mockAuthMicrosoftService.login.mockResolvedValue({
        id: 'microsoft-connect-id',
        email: 'connect@outlook.com',
        firstName: 'Connect',
        lastName: 'User',
        refreshToken: 'ms-refresh-token',
        accessToken: 'ms-access-token',
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      const res = createMockResponse();

      await authService.microsoftConnectionCallback(
        { code: 'auth-code', state },
        createMockRequest({ microsoft_connection_state: state }),
        res,
      );

      const accounts = await externalAccountTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(accounts).toHaveLength(1);
      expect(accounts[0].type).toBe(ExternalAccountType.MICROSOFT);
      expect(accounts[0].foreignId).toBe('microsoft-connect-id');
      expect(res.redirect).toHaveBeenCalledWith(
        `${settingsUrl}?microsoftConnected=true`,
      );
    });

    it('redirects to settings with failure when oauth state does not match', async () => {
      const user = await userTestProvider.create();
      const state = encrypt(user._id.toString());
      const res = createMockResponse();

      await authService.microsoftConnectionCallback(
        { code: 'auth-code', state },
        createMockRequest({ microsoft_connection_state: 'wrong-state' }),
        res,
      );

      expect(mockAuthMicrosoftService.login).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        `${settingsUrl}?microsoftConnected=false`,
      );
    });
  });

  describe('refresh', () => {
    it('refreshes tokens when a valid refresh cookie is present', async () => {
      const user = await userTestProvider.create();
      const refreshToken = 'valid-refresh-token';

      await sessionTestProvider.create({
        userId: user._id.toString(),
        refreshToken,
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = createMockResponse();

      await authService.refresh(
        createMockRequest({ 'refresh-token': refreshToken }),
        res,
      );

      const sessions = await sessionTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(sessions).toHaveLength(1);
      expect(sessions[0].refreshToken).not.toBe(refreshToken);
      expect(res.cookie).toHaveBeenCalled();
    });

    it('rejects refresh when the refresh token is expired', async () => {
      const user = await userTestProvider.create();
      const refreshToken = 'expired-refresh-token';

      await sessionTestProvider.create({
        userId: user._id.toString(),
        refreshToken,
        refreshExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        authService.refresh(
          createMockRequest({ 'refresh-token': refreshToken }),
          createMockResponse(),
        ),
      ).rejects.toThrow(new BadRequestException(ErrorTypes.RELOG_REQUIRED));
    });

    it('rejects refresh when no refresh cookie is present', async () => {
      await expect(
        authService.refresh(createMockRequest(), createMockResponse()),
      ).rejects.toThrow(new BadRequestException(ErrorTypes.RELOG_REQUIRED));
    });

    it('rejects refresh when the refresh token is unknown', async () => {
      await expect(
        authService.refresh(
          createMockRequest({ 'refresh-token': 'unknown-token' }),
          createMockResponse(),
        ),
      ).rejects.toThrow(new BadRequestException(ErrorTypes.RELOG_REQUIRED));
    });
  });

  describe('logout', () => {
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

    it('rejects logout when the refresh-token cookie is missing', async () => {
      const user = await userTestProvider.create();
      const userDTO = plainToInstance(UserDTO, user, {
        excludeExtraneousValues: true,
      });

      await expect(
        authService.logout({
          user: userDTO,
          req: createMockRequest(),
          res: createMockResponse(),
        }),
      ).rejects.toThrow(new BadRequestException(ErrorTypes.RELOG_REQUIRED));
    });
  });

  describe('logoutEverywhere', () => {
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
  });
});
