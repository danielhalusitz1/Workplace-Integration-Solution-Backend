import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';
import {
  ExternalAccountTestProvider,
  setupMongoTestLifecycle,
  UserSettingsTestProvider,
  UserTestProvider,
} from 'src/test';

import { GoogleClientService } from './google-client.service';

describe('GoogleClientService', () => {
  const ctx = setupMongoTestLifecycle({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [GoogleClientService],
  });

  let googleClientService: GoogleClientService;
  let externalAccountTestProvider: ExternalAccountTestProvider;
  let userTestProvider: UserTestProvider;
  let userSettingsTestProvider: UserSettingsTestProvider;

  beforeEach(() => {
    googleClientService = ctx.module.get(GoogleClientService);
    externalAccountTestProvider = ctx.module.get(ExternalAccountTestProvider);
    userTestProvider = ctx.module.get(UserTestProvider);
    userSettingsTestProvider = ctx.module.get(UserSettingsTestProvider);
  });

  describe('create', () => {
    it('creates an OAuth2 client with credentials from payload', () => {
      const client = googleClientService.create({
        refreshToken: 'refresh-token',
        accessToken: 'access-token',
        expiryDate: 1234567890,
      });

      expect(client).toBeInstanceOf(OAuth2Client);
      expect(client.credentials).toEqual(
        expect.objectContaining({
          refresh_token: 'refresh-token',
          access_token: 'access-token',
          expiry_date: 1234567890,
        }),
      );
    });
  });

  describe('run', () => {
    it('returns the callback result when the Google client call succeeds', async () => {
      const account = await externalAccountTestProvider.create({
        connected: true,
      });

      const result = await googleClientService.run(account, async () => 'ok');

      expect(result).toBe('ok');
    });

    it('throws RELOG_REQUIRED when invalid_grant occurs on the primary account', async () => {
      const user = await userTestProvider.create();
      const account = await externalAccountTestProvider.create({
        userId: user._id.toString(),
        connected: true,
      });

      await userSettingsTestProvider.create({
        userId: user._id.toString(),
        primaryExternalAccount: account._id.toString(),
      });

      const invalidGrantError = {
        response: { data: { error: 'invalid_grant' } },
      };

      await expect(
        googleClientService.run(account, async () => {
          throw invalidGrantError;
        }),
      ).rejects.toThrow(new UnauthorizedException(ErrorTypes.RELOG_REQUIRED));

      const updated = await externalAccountTestProvider.findByForeignId(
        account.foreignId,
      );
      expect(updated?.connected).toBe(false);
    });

    it('throws RECONNECT_REQUIRED when invalid_grant occurs on a non-primary account', async () => {
      const user = await userTestProvider.create();
      const primaryAccount = await externalAccountTestProvider.create({
        userId: user._id.toString(),
        type: ExternalAccountType.MICROSOFT,
        connected: true,
      });
      const secondaryAccount = await externalAccountTestProvider.create({
        userId: user._id.toString(),
        type: ExternalAccountType.GOOGLE,
        connected: true,
      });

      await userSettingsTestProvider.create({
        userId: user._id.toString(),
        primaryExternalAccount: primaryAccount._id.toString(),
      });

      const invalidGrantError = {
        response: { data: { error: 'invalid_grant' } },
      };

      await expect(
        googleClientService.run(secondaryAccount, async () => {
          throw invalidGrantError;
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
