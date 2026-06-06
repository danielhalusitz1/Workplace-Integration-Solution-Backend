import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';
import {
  ExternalAccountTestProvider,
  setupMongoTestLifecycle,
  UserSettingsTestProvider,
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
  let externalAccountTestProvider: ExternalAccountTestProvider;

  beforeEach(() => {
    externalAccountService = ctx.module.get(ExternalAccountService);
    userTestProvider = ctx.module.get(UserTestProvider);
    userSettingsTestProvider = ctx.module.get(UserSettingsTestProvider);
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
});
