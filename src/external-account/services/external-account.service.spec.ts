import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';
import {
  ExternalAccountTestProvider,
  setupMongoTestLifecycle,
  UserSettingsTestProvider,
  UserSubscriptionTestProvider,
  UserTestProvider,
} from 'src/test';
import { UserDTO } from 'src/user/dto/user.dto';

import { ExternalAccountService } from './external-account.service';

describe('ExternalAccountService', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_SECRET_KEY =
      process.env.ENCRYPTION_SECRET_KEY ?? 'test-encryption-secret';
  });

  const ctx = setupMongoTestLifecycle({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
  });

  let externalAccountService: ExternalAccountService;
  let userTestProvider: UserTestProvider;
  let userSettingsTestProvider: UserSettingsTestProvider;
  let userSubscriptionTestProvider: UserSubscriptionTestProvider;
  let externalAccountTestProvider: ExternalAccountTestProvider;

  beforeEach(() => {
    externalAccountService = ctx.module.get(ExternalAccountService);
    userTestProvider = ctx.module.get(UserTestProvider);
    userSettingsTestProvider = ctx.module.get(UserSettingsTestProvider);
    userSubscriptionTestProvider = ctx.module.get(UserSubscriptionTestProvider);
    externalAccountTestProvider = ctx.module.get(ExternalAccountTestProvider);
  });

  describe('delete', () => {
    it('rejects deletion when the account is the primary external account', async () => {
      const user = await userTestProvider.create();
      const primaryAccount = await externalAccountTestProvider.create({
        userId: user._id.toString(),
      });

      await userSettingsTestProvider.create({
        userId: user._id.toString(),
        primaryExternalAccount: primaryAccount._id.toString(),
      });

      const userDTO = plainToInstance(UserDTO, user, {
        excludeExtraneousValues: true,
      });

      await expect(
        externalAccountService.delete(
          { _id: primaryAccount._id.toString() },
          userDTO,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_DELETE_IS_PRIMARY,
        ),
      );
    });

    it('deletes the account when it is not the primary external account', async () => {
      const user = await userTestProvider.create();
      const primaryAccount = await externalAccountTestProvider.create({
        userId: user._id.toString(),
      });
      const secondaryAccount = await externalAccountTestProvider.create({
        userId: user._id.toString(),
        type: ExternalAccountType.MICROSOFT,
      });

      await userSettingsTestProvider.create({
        userId: user._id.toString(),
        primaryExternalAccount: primaryAccount._id.toString(),
      });

      const userDTO = plainToInstance(UserDTO, user, {
        excludeExtraneousValues: true,
      });

      await externalAccountService.delete(
        { _id: secondaryAccount._id.toString() },
        userDTO,
      );

      const remaining = await externalAccountTestProvider.findByUserId(
        user._id.toString(),
      );
      expect(remaining).toHaveLength(1);
      expect(remaining[0]._id.toString()).toBe(primaryAccount._id.toString());
    });
  });

  describe('create', () => {
    it('creates a connected external account when under the subscription limit', async () => {
      const user = await userTestProvider.create();
      await userSubscriptionTestProvider.create({
        userId: user._id.toString(),
      });

      const account = await externalAccountService.create({
        userId: user._id.toString(),
        foreignId: 'new-foreign-id',
        email: 'new@example.com',
        type: ExternalAccountType.GOOGLE,
        refreshTokenEncrypted: 'encrypted-refresh',
        accessTokenEncrypted: 'encrypted-access',
        expiryDate: Date.now() + 60 * 60 * 1000,
      });

      expect(account.connected).toBe(true);
      expect(account.foreignId).toBe('new-foreign-id');
    });

    it('rejects creation when the subscription connection limit is reached', async () => {
      const user = await userTestProvider.create();
      await userSubscriptionTestProvider.create({
        userId: user._id.toString(),
        externalAccountPerTypeLimit: 1,
      });
      await externalAccountTestProvider.create({
        userId: user._id.toString(),
        type: ExternalAccountType.GOOGLE,
      });

      await expect(
        externalAccountService.create({
          userId: user._id.toString(),
          foreignId: 'another-foreign-id',
          email: 'another@example.com',
          type: ExternalAccountType.GOOGLE,
          refreshTokenEncrypted: 'encrypted-refresh',
          accessTokenEncrypted: 'encrypted-access',
          expiryDate: Date.now() + 60 * 60 * 1000,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_VALIDATE_CONNECTION_LIMIT_LIMIT_REACHED,
        ),
      );
    });
  });

  describe('connect', () => {
    it('creates a new external account when the foreign id does not exist', async () => {
      const user = await userTestProvider.create();
      await userSubscriptionTestProvider.create({
        userId: user._id.toString(),
      });

      await externalAccountService.connect({
        foreignId: 'connect-foreign-id',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        email: 'connect@example.com',
        expiryDate: Date.now() + 60 * 60 * 1000,
        type: ExternalAccountType.GOOGLE,
        userId: user._id.toString(),
      });

      const account = await externalAccountTestProvider.findByForeignId(
        'connect-foreign-id',
      );
      expect(account).not.toBeNull();
      expect(account?.connected).toBe(true);
      expect(account?.userId).toBe(user._id.toString());
    });

    it('reconnects a disconnected account with the same foreign id', async () => {
      const user = await userTestProvider.create();
      await userSubscriptionTestProvider.create({
        userId: user._id.toString(),
        externalAccountPerTypeLimit: 2,
      });
      await externalAccountTestProvider.create({
        userId: user._id.toString(),
        foreignId: 'reconnect-foreign-id',
        type: ExternalAccountType.GOOGLE,
        connected: false,
      });

      await externalAccountService.connect({
        foreignId: 'reconnect-foreign-id',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        email: 'reconnect@example.com',
        expiryDate: Date.now() + 60 * 60 * 1000,
        type: ExternalAccountType.GOOGLE,
        userId: user._id.toString(),
      });

      const account = await externalAccountTestProvider.findByForeignId(
        'reconnect-foreign-id',
      );
      expect(account?.connected).toBe(true);
      expect(account?.email).toBe('reconnect@example.com');
    });

    it('rejects connection when the foreign account belongs to another user', async () => {
      const owner = await userTestProvider.create();
      const otherUser = await userTestProvider.create();
      await externalAccountTestProvider.create({
        userId: owner._id.toString(),
        foreignId: 'shared-foreign-id',
        connected: false,
      });

      await expect(
        externalAccountService.connect({
          foreignId: 'shared-foreign-id',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          email: 'shared@example.com',
          expiryDate: Date.now() + 60 * 60 * 1000,
          type: ExternalAccountType.GOOGLE,
          userId: otherUser._id.toString(),
        }),
      ).rejects.toThrow(
        new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_USER_ID_MISMATCH,
        ),
      );
    });

    it('rejects connection when the account is already connected', async () => {
      const user = await userTestProvider.create();
      await externalAccountTestProvider.create({
        userId: user._id.toString(),
        foreignId: 'connected-foreign-id',
        connected: true,
      });

      await expect(
        externalAccountService.connect({
          foreignId: 'connected-foreign-id',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          email: 'connected@example.com',
          expiryDate: Date.now() + 60 * 60 * 1000,
          type: ExternalAccountType.GOOGLE,
          userId: user._id.toString(),
        }),
      ).rejects.toThrow(
        new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_ALREADY_CONNECTED,
        ),
      );
    });
  });
});
