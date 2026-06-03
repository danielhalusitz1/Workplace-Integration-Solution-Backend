import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { UserService } from 'src/user/services/user.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { encrypt } from 'src/utils/encrypt';

import { AuthAuthUserDTO } from '../dto/auth-auth-user.dto';
import { GetTokensDTO } from '../dto/auth-get-tokens.dto';
import { AuthGoogleDTO, AuthGoogleResponseDTO } from '../dto/auth-google.dto';
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
    private readonly jwtService: JwtService,
  ) {}

  async google(payload: AuthGoogleDTO): Promise<AuthGoogleResponseDTO> {
    const googleUser = await this.authGoogleService.login(payload);

    const accessToken = googleUser.accessToken;
    const expiryDate = googleUser.expiryDate;

    if (!accessToken || expiryDate === null || expiryDate === undefined) {
      throw new BadRequestException('error.auth-service.google.auth-failed');
    }

    const tokens = await this.authAuthUser({
      foreignId: googleUser.id,
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      googleConnected: true,
      accessToken,
      refreshToken: googleUser.refreshToken,
      expiryDate,
      extednalAccountType: ExternalAccountType.GOOGLE,
    });

    return tokens;
  }

  async authAuthUser(payload: AuthAuthUserDTO) {
    const {
      foreignId,
      email,
      firstName,
      lastName,
      googleConnected,
      microsoftConnected,
      accessToken,
      refreshToken,
      expiryDate,
      extednalAccountType,
    } = payload;

    let user = await this.userService.findOneByFilters({
      email,
    });

    const accessTokenEncrypted = encrypt(accessToken);

    await this.mongodbTransactionService.withTransaction(async (session) => {
      if (user) {
        await this.userSettingsService.updateByFilters(
          {
            userSettingsId: user.userSettingsId,
          },
          {
            ...(googleConnected !== undefined ? { googleConnected } : {}),
            ...(microsoftConnected !== undefined ? { microsoftConnected } : {}),
          },
          session,
        );

        await this.externalAccountModel.updateOne(
          {
            userId: user._id.toString(),
            type: extednalAccountType,
          },
          {
            foreignId,
            ...(refreshToken
              ? { refreshTokenEncrypted: encrypt(refreshToken) }
              : {}),
            accessTokenEncrypted,
            expiryDate,
          },
          { session, upsert: true },
        );
      } else {
        if (!refreshToken) {
          throw new BadRequestException(
            'error.auth-auth-user.registration-failed',
          );
        }

        const refreshTokenEncrypted = encrypt(refreshToken);

        const userSettings = await this.userSettingsService.create(
          {
            ...(googleConnected !== undefined ? { googleConnected } : {}),
            ...(microsoftConnected !== undefined ? { microsoftConnected } : {}),
          },

          session,
        );

        user = await this.userService.create(
          {
            email,
            userSettingsId: userSettings._id.toString(),
            firstName,
            lastName,
          },
          session,
        );

        await this.externalAccountModel.create(
          [
            {
              foreignId,
              refreshTokenEncrypted,
              accessTokenEncrypted,
              expiryDate,
              userId: user?._id.toString(),
              type: extednalAccountType,
            },
          ],
          { session },
        );
      }
    });

    return {
      accessToken: '',
      refreshToken: '',
    };
  }

  async getTokens(payload: GetTokensDTO) {
    const { user } = payload;

    //const accessToken = this.jwtService.
  }
}
