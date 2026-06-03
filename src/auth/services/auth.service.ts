import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { UserService } from 'src/user/services/user.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { encrypt } from 'src/utils/encrypt';

import { AuthCreateUserDTO } from '../dto/auth-create-user.dto';
import { AuthGoogleDTO } from '../dto/auth-google.dto';
import { ExternalAccountType } from '../enum/external-account-type.enum';
import { ExternalAccount } from '../schemas/external-account.schema';
import { Session } from '../schemas/session.schema';
import { AuthGoogleService } from './auth-google.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,

    private readonly authGoogleService: AuthGoogleService,
    private readonly userService: UserService,
    private readonly userSettingsService: UserSettingsService,
    private readonly mongodbTransactionService: MongodbTransactionService,
  ) {}

  async google(payload: AuthGoogleDTO) {
    const googleUser = await this.authGoogleService.login(payload);

    let user = await this.userService.findOneByFilters({
      googleId: googleUser.id,
    });

    const transactionResult = this.mongodbTransactionService.withTransaction(
      async (session) => {
        if (user) {
          await this.userSettingsService.updateByFilters(
            {
              userSettingsId: user.userSettingsId,
            },
            { googleConnected: true },
            session,
          );

          const refreshToken = googleUser.refreshToken;
          const accessToken = googleUser.accessToken;
          const expiryDate = googleUser.expiryDate;

          if (
            refreshToken &&
            accessToken &&
            expiryDate !== null &&
            expiryDate !== undefined
          ) {
            const refreshTokenEncrypted = encrypt(refreshToken);
            const accessTokenEncrypted = encrypt(accessToken);

            await this.externalAccountModel.updateOne(
              {
                userId: user._id.toString(),
                foreignId: googleUser.id,
                type: ExternalAccountType.GOOGLE,
              },
              {
                refreshTokenEncrypted,
                accessTokenEncrypted,
                expiryDate,
              },
              session,
            );
          } else {
            throw new BadRequestException(
              'error.auth-service.google.login_failed',
            );
          }
        } else {
          const refreshToken = googleUser.refreshToken;
          const accessToken = googleUser.accessToken;
          const expiryDate = googleUser.expiryDate;

          if (
            !refreshToken ||
            !accessToken ||
            expiryDate === null ||
            expiryDate === undefined
          ) {
            throw new BadRequestException(
              'error.auth-service.google.login_failed',
            );
          }
          const userSettings = await this.userSettingsService.create(
            {
              googleConnected: true,
              microsoftConnected: false,
            },
            session,
          );

          const refreshTokenEncrypted = encrypt(refreshToken);
          const accessTokenEncrypted = encrypt(accessToken);

          user = await this.userService.create(
            {
              email: googleUser.email,
              userSettingsId: userSettings._id.toString(),
              firstName: googleUser.firstName,
              lastName: googleUser.lastName,
              googleId: googleUser.id,
            },
            session,
          );

          await this.externalAccountModel.create(
            [
              {
                foreignId: googleUser.id,
                refreshTokenEncrypted,
                accessTokenEncrypted,
                expiryDate,
                userId: user?._id.toString(),
                type: ExternalAccountType.GOOGLE,
              },
            ],
            { session },
          );
        }
      },
    );
  }

  async createUser(payload: AuthCreateUserDTO) {}
}
