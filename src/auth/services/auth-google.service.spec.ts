import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { GoogleClientService } from 'src/google-client/services/google-client.service';
import { createMockResponse, setupMongoTestLifecycle } from 'src/test';
import { UserDTO } from 'src/user/dto/user.dto';

import { AuthGoogleService } from './auth-google.service';

describe('AuthGoogleService', () => {
  const mockGoogleClient = {
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    request: jest.fn(),
    generateAuthUrl: jest
      .fn()
      .mockReturnValue('https://accounts.google.com/o/oauth2/auth'),
  };

  const mockGoogleClientService = {
    create: jest.fn().mockReturnValue(mockGoogleClient),
    run: jest.fn(),
  };

  const ctx = setupMongoTestLifecycle({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [
      AuthGoogleService,
      { provide: GoogleClientService, useValue: mockGoogleClientService },
    ],
  });

  let authGoogleService: AuthGoogleService;

  beforeEach(() => {
    authGoogleService = ctx.module.get(AuthGoogleService);
    jest.clearAllMocks();
    mockGoogleClientService.create.mockReturnValue(mockGoogleClient);
  });

  describe('login', () => {
    it('returns Google user data on successful login', async () => {
      mockGoogleClient.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expiry_date: Date.now() + 60 * 60 * 1000,
        },
      });
      mockGoogleClient.request.mockResolvedValue({
        data: {
          id: 'google-id',
          email: 'user@gmail.com',
          name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
        },
      });

      const result = await authGoogleService.login({ code: 'auth-code' });

      expect(result).toEqual({
        id: 'google-id',
        email: 'user@gmail.com',
        firstName: 'Test',
        lastName: 'User',
        refreshToken: 'refresh-token',
        accessToken: 'access-token',
        expiryDate: expect.any(Number),
      });
      expect(mockGoogleClient.setCredentials).toHaveBeenCalled();
    });

    it('throws when Google token exchange fails', async () => {
      mockGoogleClient.getToken.mockRejectedValue(new Error('invalid_grant'));

      await expect(
        authGoogleService.login({ code: 'bad-code' }),
      ).rejects.toThrow(new BadRequestException(ErrorTypes.LOGIN_FAILED));
    });

    it('throws when Google userinfo request fails', async () => {
      mockGoogleClient.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expiry_date: Date.now() + 60 * 60 * 1000,
        },
      });
      mockGoogleClient.request.mockRejectedValue(new Error('userinfo failed'));

      await expect(
        authGoogleService.login({ code: 'auth-code' }),
      ).rejects.toThrow(new BadRequestException(ErrorTypes.LOGIN_FAILED));
    });
  });

  describe('getAuthUrl', () => {
    it('sets state cookie and returns auth url', () => {
      const res = createMockResponse();

      const url = authGoogleService.getAuthUrl({ res });

      expect(url).toContain('https://accounts.google.com');
      expect(res.cookie).toHaveBeenCalledWith(
        'google_auth_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockGoogleClientService.create).toHaveBeenCalled();
      expect(mockGoogleClient.generateAuthUrl).toHaveBeenCalled();
    });
  });

  describe('getConnectionUrl', () => {
    it('sets connection state cookie and returns auth url', () => {
      const res = createMockResponse();
      const user = plainToInstance(
        UserDTO,
        { _id: 'user-id' },
        {
          excludeExtraneousValues: true,
        },
      );

      const url = authGoogleService.getConnectionUrl({ user, res });

      expect(url).toContain('https://accounts.google.com');
      expect(res.cookie).toHaveBeenCalledWith(
        'google_connection_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockGoogleClientService.create).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUri: expect.any(String) }),
      );
      expect(mockGoogleClient.generateAuthUrl).toHaveBeenCalled();
    });
  });
});
