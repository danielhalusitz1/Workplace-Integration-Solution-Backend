import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';
import {
  ExternalAccountTestProvider,
  setupMongoTestLifecycle,
  UserSettingsTestProvider,
  UserTestProvider,
} from 'src/test';

import { MicrosoftClientService } from './microsoft-client.service';

jest.mock('axios', () => {
  const actual = jest.requireActual<typeof import('axios')>('axios');
  return {
    ...actual,
    post: jest.fn(),
    get: jest.fn(),
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

function createAxios401Error(): AxiosError {
  const error = new AxiosError('Unauthorized');
  error.response = {
    status: 401,
    data: {},
    statusText: 'Unauthorized',
    headers: {},
    config: {} as AxiosError['config'],
  };
  return error;
}

describe('MicrosoftClientService', () => {
  const ctx = setupMongoTestLifecycle({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [MicrosoftClientService],
  });

  let microsoftClientService: MicrosoftClientService;
  let externalAccountTestProvider: ExternalAccountTestProvider;
  let userTestProvider: UserTestProvider;
  let userSettingsTestProvider: UserSettingsTestProvider;

  beforeEach(() => {
    microsoftClientService = ctx.module.get(MicrosoftClientService);
    externalAccountTestProvider = ctx.module.get(ExternalAccountTestProvider);
    userTestProvider = ctx.module.get(UserTestProvider);
    userSettingsTestProvider = ctx.module.get(UserSettingsTestProvider);
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    it('returns refreshed tokens from Microsoft', async () => {
      const account = await externalAccountTestProvider.create();

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          id_token: 'id-token',
        },
      });

      const result = await microsoftClientService.refreshToken(account);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiryDate).toBeGreaterThan(Date.now());
    });
  });

  describe('run', () => {
    it('returns the callback result when the access token is still valid', async () => {
      const account = await externalAccountTestProvider.create({
        connected: true,
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      const result = await microsoftClientService.run(
        account,
        async () => 'ok',
      );

      expect(result).toBe('ok');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('refreshes the token before running when the access token is near expiry', async () => {
      const account = await externalAccountTestProvider.create({
        connected: true,
        expiryDate: Date.now() + 2 * 60 * 1000,
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'refreshed-access-token',
          refresh_token: 'refreshed-refresh-token',
          expires_in: 3600,
          id_token: 'id-token',
        },
      });

      const result = await microsoftClientService.run(
        account,
        async () => 'refreshed-ok',
      );

      expect(result).toBe('refreshed-ok');
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('retries the callback once after a 401 response', async () => {
      const account = await externalAccountTestProvider.create({
        connected: true,
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'retry-access-token',
          refresh_token: 'retry-refresh-token',
          expires_in: 3600,
          id_token: 'id-token',
        },
      });

      let attempts = 0;

      const result = await microsoftClientService.run(account, async () => {
        attempts += 1;
        if (attempts === 1) {
          throw createAxios401Error();
        }
        return 'retry-ok';
      });

      expect(result).toBe('retry-ok');
      expect(attempts).toBe(2);
    });

    it('throws RELOG_REQUIRED when refresh fails on the primary account', async () => {
      const user = await userTestProvider.create();
      const account = await externalAccountTestProvider.create({
        userId: user._id.toString(),
        connected: true,
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      await userSettingsTestProvider.create({
        userId: user._id.toString(),
        primaryExternalAccount: account._id.toString(),
      });

      mockedAxios.post.mockRejectedValue(new Error('refresh failed'));

      await expect(
        microsoftClientService.run(account, async () => {
          throw createAxios401Error();
        }),
      ).rejects.toThrow(new UnauthorizedException(ErrorTypes.RELOG_REQUIRED));

      const updated = await externalAccountTestProvider.findByForeignId(
        account.foreignId,
      );
      expect(updated?.connected).toBe(false);
    });

    it('throws RECONNECT_REQUIRED when refresh fails on a non-primary account', async () => {
      const user = await userTestProvider.create();
      const primaryAccount = await externalAccountTestProvider.create({
        userId: user._id.toString(),
        type: ExternalAccountType.GOOGLE,
        connected: true,
      });
      const secondaryAccount = await externalAccountTestProvider.create({
        userId: user._id.toString(),
        type: ExternalAccountType.MICROSOFT,
        connected: true,
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      await userSettingsTestProvider.create({
        userId: user._id.toString(),
        primaryExternalAccount: primaryAccount._id.toString(),
      });

      mockedAxios.post.mockRejectedValue(new Error('refresh failed'));

      await expect(
        microsoftClientService.run(secondaryAccount, async () => {
          throw createAxios401Error();
        }),
      ).rejects.toThrow(
        new UnauthorizedException(ErrorTypes.RECONNECT_REQUIRED),
      );

      const updated = await externalAccountTestProvider.findByForeignId(
        secondaryAccount.foreignId,
      );
      expect(updated?.connected).toBe(false);
    });
  });
});
