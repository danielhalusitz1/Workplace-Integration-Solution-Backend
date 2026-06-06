import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { MicrosoftClientService } from 'src/microsoft-client/services/microsoft-client.service';
import { createMockResponse, setupMongoTestLifecycle } from 'src/test';
import { UserDTO } from 'src/user/dto/user.dto';

import { AuthMicrosoftService } from './auth-microsoft.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthMicrosoftService', () => {
  const mockMsalClient = {
    getAuthCodeUrl: jest
      .fn()
      .mockResolvedValue('https://login.microsoftonline.com/auth'),
  };

  const mockMicrosoftClientService = {
    msalClient: mockMsalClient,
    run: jest.fn(),
    refreshToken: jest.fn(),
  };

  const ctx = setupMongoTestLifecycle({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [
      AuthMicrosoftService,
      {
        provide: MicrosoftClientService,
        useValue: mockMicrosoftClientService,
      },
    ],
  });

  let authMicrosoftService: AuthMicrosoftService;

  beforeEach(() => {
    authMicrosoftService = ctx.module.get(AuthMicrosoftService);
    jest.clearAllMocks();
    mockMsalClient.getAuthCodeUrl.mockResolvedValue(
      'https://login.microsoftonline.com/auth',
    );
  });

  describe('login', () => {
    it('returns Microsoft user data on successful login', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'ms-access-token',
          refresh_token: 'ms-refresh-token',
          expires_in: 3600,
        },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 'ms-id',
          givenName: 'Test',
          surname: 'User',
          mail: 'user@outlook.com',
        },
      });

      const result = await authMicrosoftService.login({ code: 'auth-code' });

      expect(result).toEqual({
        id: 'ms-id',
        email: 'user@outlook.com',
        firstName: 'Test',
        lastName: 'User',
        accessToken: 'ms-access-token',
        refreshToken: 'ms-refresh-token',
        expiryDate: expect.any(Number),
      });
    });

    it('falls back to otherMails when mail is missing', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'ms-access-token',
          refresh_token: 'ms-refresh-token',
          expires_in: 3600,
        },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 'ms-id',
          givenName: 'Test',
          surname: 'User',
          otherMails: ['fallback@outlook.com'],
        },
      });

      const result = await authMicrosoftService.login({ code: 'auth-code' });

      expect(result.email).toBe('fallback@outlook.com');
    });

    it('throws when Microsoft profile has no email', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'ms-access-token',
          refresh_token: 'ms-refresh-token',
          expires_in: 3600,
        },
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 'ms-id',
          givenName: 'Test',
          surname: 'User',
        },
      });

      await expect(
        authMicrosoftService.login({ code: 'auth-code' }),
      ).rejects.toThrow(new BadRequestException(ErrorTypes.LOGIN_FAILED));
    });
  });

  describe('getAuthUrl', () => {
    it('sets state cookie and returns auth url', async () => {
      const res = createMockResponse();

      const url = await authMicrosoftService.getAuthUrl({ res });

      expect(url).toBe('https://login.microsoftonline.com/auth');
      expect(res.cookie).toHaveBeenCalledWith(
        'microsoft_auth_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockMsalClient.getAuthCodeUrl).toHaveBeenCalled();
    });
  });

  describe('getConnectionUrl', () => {
    it('sets connection state cookie and returns auth url', async () => {
      const res = createMockResponse();
      const user = plainToInstance(
        UserDTO,
        { _id: 'user-id' },
        {
          excludeExtraneousValues: true,
        },
      );

      const url = await authMicrosoftService.getConnectionUrl({ user, res });

      expect(url).toBe('https://login.microsoftonline.com/auth');
      expect(res.cookie).toHaveBeenCalledWith(
        'microsoft_connection_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockMsalClient.getAuthCodeUrl).toHaveBeenCalled();
    });
  });
});
