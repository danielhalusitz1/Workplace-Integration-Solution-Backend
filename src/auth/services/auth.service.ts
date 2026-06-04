import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import type { Request, Response } from 'express';
import { Model, Types } from 'mongoose';
import { GoogleClientService } from 'src/google-client/google-client.service';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { UserDTO } from 'src/user/dto/user.dto';
import { UserDocument } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { encrypt } from 'src/utils/encrypt';

import {
  AuthAuthUserDTO,
  AuthAuthUserResponseDTO,
} from '../dto/auth-auth-user.dto';
import { AuthClearCookieDTO } from '../dto/auth-clear-cookie.dto';
import { AuthCreateUserDTO } from '../dto/auth-create-user.dto';
import { AuthGetActiveSessionDTO } from '../dto/auth-get-active-session.dto';
import { AuthGetGoogleUrlDTO } from '../dto/auth-get-google-url.dto';
import { GetTokensDTO, GetTokensResponseDTO } from '../dto/auth-get-tokens.dto';
import { AuthGoogleDTO } from '../dto/auth-google.dto';
import { AuthLinkAccountDTO } from '../dto/auth-link-account.dto';
import { AuthLogoutDTO } from '../dto/auth-logout.dto';
import { AuthLogoutEveryWhereDTO } from '../dto/auth-logout-everywhere.dto';
import { AuthSetCookie } from '../dto/auth-set-cookie.dto';
import { AuthUpdateSettingsAndExternalAccountDTO } from '../dto/auth-update-settings-and-external-account.dto';
import { ExternalAccountType } from '../enum/external-account-type.enum';
import { ExternalAccount } from '../schemas/external-account.schema';
import { Session, SessionDocument } from '../schemas/session.schema';
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
    private readonly googleClientService: GoogleClientService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private async removeExpiredSessions() {
    const now = new Date();

    await this.sessionModel.deleteMany({
      refreshExpiresAt: { $lte: now },
    });
  }

  getGoogleUrl(payload: AuthGetGoogleUrlDTO) {
    const { res } = payload;

    const state = crypto.randomUUID();

    res.cookie('google_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 5 * 60 * 1000,
    });

    const client = this.googleClientService.create();

    const redirectUri = this.configService.getOrThrow<string>(
      'GOOGLE_AUTH_REDIRECT_URI',
    );
    const base = this.configService.getOrThrow<string>('BASE');
    const port = this.configService.getOrThrow<string>('PORT');

    const redirectUrl = `${base}:${port}/${redirectUri}`;

    const url = client.generateAuthUrl({
      response_type: 'code',
      scope: ['openid', 'email', 'profile'],
      access_type: 'offline',
      redirect_uri: redirectUrl,
      prompt: 'consent',
      state,
    });

    return url;
  }

  async google(
    payload: AuthGoogleDTO,
    req: Request,
    res: Response,
  ): Promise<void> {
    const googleStateFromCookie = req.cookies['google_state'] as
      | string
      | undefined;

    if (
      !payload.state ||
      !googleStateFromCookie ||
      payload.state !== googleStateFromCookie
    ) {
      throw new BadRequestException('error.auth-service.google.state-missing');
    }

    res.clearCookie('google_state', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    });

    const googleUser = await this.authGoogleService.login(payload);

    const accessToken = googleUser.accessToken;
    const expiryDate = googleUser.expiryDate;

    if (!accessToken || expiryDate === null || expiryDate === undefined) {
      throw new BadRequestException('error.auth-service.google.auth-failed');
    }

    const tokens = await this.authUser({
      foreignId: googleUser.id,
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      googleConnected: true,
      accessToken,
      refreshToken: googleUser.refreshToken,
      expiryDate,
      externalAccountType: ExternalAccountType.GOOGLE,
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

  private async loginUser(
    payload: AuthUpdateSettingsAndExternalAccountDTO,
  ): Promise<void> {
    const {
      user,
      session,
      googleConnected,
      microsoftConnected,
      accessToken,
      email,
      expiryDate,
      externalAccountType,
      foreignId,
      refreshToken,
    } = payload;

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
        type: externalAccountType,
      },
      {
        email,
        foreignId,
        ...(refreshToken
          ? { refreshTokenEncrypted: encrypt(refreshToken) }
          : {}),
        accessTokenEncrypted: encrypt(accessToken),
        expiryDate,
      },
      { session },
    );
  }

  private async createUser(payload: AuthCreateUserDTO): Promise<UserDocument> {
    const {
      session,
      googleConnected,
      microsoftConnected,
      externalAccountType,
      foreignId,
      email,
      accessToken,
      expiryDate,
      refreshToken,
      firstName,
      lastName,
    } = payload;

    if (!refreshToken) {
      throw new BadRequestException('error.auth-auth-user.registration-failed');
    }

    const externalAccountMongoId = new Types.ObjectId();

    const userSettings = await this.userSettingsService.create(
      {
        ...(googleConnected !== undefined ? { googleConnected } : {}),
        ...(microsoftConnected !== undefined ? { microsoftConnected } : {}),
        primaryExternalAccount: externalAccountMongoId.toString(),
      },
      session,
    );

    const user = await this.userService.create(
      {
        userSettingsId: userSettings._id.toString(),
        firstName,
        lastName,
      },
      session,
    );

    await this.externalAccountModel.create(
      [
        {
          _id: externalAccountMongoId,
          foreignId,
          refreshTokenEncrypted: encrypt(refreshToken),
          accessTokenEncrypted: encrypt(accessToken),
          expiryDate,
          userId: user._id.toString(),
          type: externalAccountType,
          email,
        },
      ],
      { session },
    );

    return user;
  }

  private async linkAccount(payload: AuthLinkAccountDTO) {
    const {
      refreshToken,
      foreignId,
      accessToken,
      expiryDate,
      user,
      externalAccountType,
      googleConnected,
      microsoftConnected,
      session,
      email,
    } = payload;

    if (!refreshToken) {
      throw new BadRequestException('error.auth-auth-user.registration-failed');
    }

    await this.externalAccountModel.create(
      [
        {
          foreignId,
          refreshTokenEncrypted: encrypt(refreshToken),
          accessTokenEncrypted: encrypt(accessToken),
          expiryDate,
          userId: user._id.toString(),
          type: externalAccountType,
          email,
        },
      ],
      { session },
    );

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
  }

  private async authUser(
    payload: AuthAuthUserDTO,
  ): Promise<AuthAuthUserResponseDTO> {
    const { foreignId, email, externalAccountType } = payload;

    const transactionResult =
      await this.mongodbTransactionService.withTransaction(async (session) => {
        const externalAccount = await this.externalAccountModel.findOne(
          {
            foreignId,
          },
          { session },
        );

        let user: null | UserDocument = null;

        if (externalAccount) {
          user = await this.userService.findOneByFilters(
            {
              _id: new Types.ObjectId(externalAccount.userId),
            },
            { session },
          );
        }

        if (user) {
          await this.loginUser({
            ...payload,
            user,
            session,
          });
        } else {
          const otherExternalAccount = await this.externalAccountModel.findOne(
            {
              email,
              type: { $ne: externalAccountType },
            },
            { session },
          );

          if (otherExternalAccount) {
            user = await this.userService.findOneByFilters(
              {
                _id: new Types.ObjectId(otherExternalAccount.userId),
              },
              { session },
            );
          }

          if (user) {
            await this.linkAccount({ ...payload, session, user });
          } else {
            user = await this.createUser({ ...payload, session });
          }
        }

        const userDTO = plainToInstance(UserDTO, user, {
          excludeExtraneousValues: true,
        });
        const tokens = await this.getTokens({ user: userDTO });

        await this.sessionModel.create(
          [
            {
              userId: user._id.toString(),
              accessToken: tokens.accessToken,
              accessExpiresAt: tokens.accessExpiresAt,
              refreshToken: tokens.refreshToken,
              refreshExpiresAt: tokens.refreshExpiresAt,
            },
          ],
          { session },
        );

        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessExpiresAt: tokens.accessExpiresAt,
          refreshExpiresAt: tokens.refreshExpiresAt,
        };
      });

    return transactionResult;
  }

  async refresh(req: Request, res: Response) {
    const refreshTokenFromCookie = req.cookies['refresh-token'] as
      | string
      | undefined;

    if (!refreshTokenFromCookie) {
      throw new BadRequestException(
        'error.auth.refresh.refresh-token-not-found',
      );
    }

    const oldSession = await this.sessionModel.findOne({
      refreshToken: refreshTokenFromCookie,
    });

    if (!oldSession) {
      throw new BadRequestException('error.auth.refresh.session-not-found');
    }

    const user = await this.userService.findOneByFilters({
      _id: new Types.ObjectId(oldSession?.userId),
    });

    if (!user) {
      throw new BadRequestException('error.auth.refresh.user-not-found');
    }

    const userDTO = plainToInstance(UserDTO, user, {
      excludeExtraneousValues: true,
    });

    const tokens = await this.getTokens({ user: userDTO });
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
        returnDocument: 'after',
      },
    );

    if (!session) {
      throw new BadRequestException('error.auth.refresh.session-not-found');
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

    const plainUser = {
      ...user,
    };

    const accessToken = await this.jwtService.signAsync(plainUser, {
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(plainUser, {
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
      sameSite: 'none',
      expires: accessExpiresAt,
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      expires: refreshExpiresAt,
    });

    if (redirect) {
      res.redirect(this.configService.getOrThrow<string>('WEB_BASE'));
    }
  }

  private clearCookie(payload: AuthClearCookieDTO): void {
    const { res } = payload;

    res.clearCookie('access-token', { sameSite: 'none' });
    res.clearCookie('refresh-token', { sameSite: 'none' });
  }

  async getActiveSession(
    payload: AuthGetActiveSessionDTO,
  ): Promise<SessionDocument | null> {
    const { accessToken, userId } = payload;

    const now = new Date();
    return await this.sessionModel.findOne({
      userId,
      accessToken,
      accessExpiresAt: { $gte: now },
    });
  }
}
