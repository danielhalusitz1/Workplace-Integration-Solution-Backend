import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import type { Request, Response } from 'express';
import { Model } from 'mongoose';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { UserDTO } from 'src/user/dto/user.dto';
import { UserService } from 'src/user/services/user.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { encrypt } from 'src/utils/encrypt';

import {
  AuthAuthUserDTO,
  AuthAuthUserResponseDTO,
} from '../dto/auth-auth-user.dto';
import { AuthClearCookieDTO } from '../dto/auth-clear-cookie.dto';
import { AuthGetActiveSessionDTO } from '../dto/auth-get-active-session.dto';
import { GetTokensDTO, GetTokensResponseDTO } from '../dto/auth-get-tokens.dto';
import { AuthGoogleDTO } from '../dto/auth-google.dto';
import { AuthLogoutDTO } from '../dto/auth-logout.dto';
import { AuthLogoutEveryWhereDTO } from '../dto/auth-logout-everywhere.dto';
import { AuthSetCookie } from '../dto/auth-set-cookie.dto';
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
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly userSettingsService: UserSettingsService,
    private readonly mongodbTransactionService: MongodbTransactionService,
    private readonly jwtService: JwtService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private removeExpiredSessions() {
    const now = new Date();

    this.sessionModel.deleteMany({
      refreshExpiresAt: { $lte: now },
    });
  }

  async google(payload: AuthGoogleDTO, res: Response): Promise<void> {
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

    this.setCookie({
      accessToken: tokens.accessToken,
      accessExpiresAt: tokens.accessExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
      redirect: true,
      res,
    });
  }

  private async authAuthUser(
    payload: AuthAuthUserDTO,
  ): Promise<AuthAuthUserResponseDTO> {
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

    const transactionResult =
      await this.mongodbTransactionService.withTransaction(async (session) => {
        if (user) {
          await this.userSettingsService.updateByFilters(
            {
              userSettingsId: user.userSettingsId,
            },
            {
              ...(googleConnected !== undefined ? { googleConnected } : {}),
              ...(microsoftConnected !== undefined
                ? { microsoftConnected }
                : {}),
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
              ...(microsoftConnected !== undefined
                ? { microsoftConnected }
                : {}),
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

        const userDTO = plainToInstance(UserDTO, user.toObject(), {
          excludeExtraneousValues: true,
        });
        const tokens = await this.getTokens({ user: userDTO });

        await this.sessionModel.create({
          userId: user._id.toString(),
          accessToken: tokens.accessToken,
          accessExpiresAt: tokens.accessExpiresAt,
          refreshToken: tokens.refreshToken,
          refreshExpiresAt: tokens.refreshExpiresAt,
        });

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessExpiresAt: tokens.accessExpiresAt,
          refreshExpiresAt: tokens.refreshExpiresAt,
        };
      });

    return transactionResult;
  }

  async refresh(user: UserDTO, req: Request, res: Response) {
    const refreshTokenFromCookie = req.cookies['refresh-token'] as
      | string
      | undefined;

    const tokens = await this.getTokens({ user });
    const { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt } =
      tokens;
    const now = new Date();

    const session = await this.sessionModel.findOneAndUpdate(
      {
        userId: user._id.toString(),
        refreshToken: refreshTokenFromCookie,
        refreshExpiresAt: { $gte: now },
      },
      {
        accessToken,
        accessExpiresAt,
        refreshToken,
        refreshExpiresAt,
      },
      {
        new: true,
      },
    );

    if (!session) {
      throw new BadRequestException('error.refresh.failed');
    }

    this.setCookie({
      accessToken,
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
      redirect: false,
      res,
    });
  }

  private async getTokens(
    payload: GetTokensDTO,
  ): Promise<GetTokensResponseDTO> {
    const { user } = payload;

    const now = Date.now();

    const accessToken = await this.jwtService.signAsync(user, {
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(user, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      accessExpiresAt: new Date(now + 24 * 60 * 60 * 1000),
      refreshToken,
      refreshExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async logout(payload: AuthLogoutDTO): Promise<void> {
    const { user, req, res } = payload;

    const refreshTokenFromCookie = req.cookies['refresh-token'] as
      | string
      | undefined;

    await this.sessionModel.deleteOne({
      userId: user._id.toString(),
      refreshToken: refreshTokenFromCookie,
    });

    this.clearCookie({ res });
  }

  async logoutEverywhere(payload: AuthLogoutEveryWhereDTO): Promise<void> {
    const { user, res } = payload;

    await this.sessionModel.deleteMany({ userId: user._id.toString() });

    this.clearCookie({ res });
  }

  private setCookie(payload: AuthSetCookie): void {
    const {
      accessToken,
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
      res,
      redirect,
    } = payload;

    res.cookie('access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: accessExpiresAt,
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: refreshExpiresAt,
    });

    if (redirect) {
      res.redirect(this.configService.getOrThrow<string>('BASE'));
    }
  }

  private clearCookie(payload: AuthClearCookieDTO): void {
    const { res } = payload;

    res.clearCookie('access-token');
    res.clearCookie('refresh-token');
  }

  async getActiveSession(
    payload: AuthGetActiveSessionDTO,
  ): Promise<Session | null> {
    const { accessToken, userId } = payload;

    const now = new Date();
    return await this.sessionModel.findOne({
      userId,
      accessToken,
      accessExpiresAt: { $gte: now },
    });
  }
}
