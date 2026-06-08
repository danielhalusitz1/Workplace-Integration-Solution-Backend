import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { SessionService } from 'src/session/services/session.service';
import { UserDTO } from 'src/user/dto/user.dto';
import { UserDocument } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { UserSubscriptionService } from 'src/user-subscription/services/user-subscription.service';
import { decrypt, encrypt } from 'src/utils/encrypt';

import { ExternalAccountType } from '../../external-account/enums/external-account-type.enum';
import {
  AuthAuthUserDTO,
  AuthAuthUserResponseDTO,
} from '../dto/auth-auth-user.dto';
import { AuthClearCookieDTO } from '../dto/auth-clear-cookie.dto';
import { AuthCreateUserDTO } from '../dto/auth-create-user.dto';
import { AuthGetGoogleAuthUrlDTO } from '../dto/auth-get-google-auth-url.dto';
import { AuthGetGoogleConnectionUrlDTO } from '../dto/auth-get-google-connection-url.dto';
import { AuthGetMicrosoftAuthUrlDTO } from '../dto/auth-get-microsoft-auth-url.dto';
import { AuthGetMicrosoftConnectionUrlDTO } from '../dto/auth-get-microsoft-connection-url.dto';
import { GetTokensDTO, GetTokensResponseDTO } from '../dto/auth-get-tokens.dto';
import { AuthGoogleAuthCallbackDTO } from '../dto/auth-google-auth-callback.dto';
import { AuthGoogleConnectionCallbackDTO } from '../dto/auth-google-connection-callback.dto';
import { AuthLinkAccountDTO } from '../dto/auth-link-account.dto';
import { AuthLogoutDTO } from '../dto/auth-logout.dto';
import { AuthLogoutEveryWhereDTO } from '../dto/auth-logout-everywhere.dto';
import { AuthMicrosoftAuthCallbackDTO } from '../dto/auth-microsoft-auth-callback.dto';
import { AuthMicrosoftConnectionCallbackDTO } from '../dto/auth-microsoft-connection-callback.dto';
import { AuthSetCookie } from '../dto/auth-set-cookie.dto';
import { AuthUpdateSettingsAndExternalAccountDTO } from '../dto/auth-update-settings-and-external-account.dto';
import { AuthGoogleService } from './auth-google.service';
import { AuthMicrosoftService } from './auth-microsoft.service';

@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AuthService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly externalAccountService: ExternalAccountService,
    private readonly authGoogleService: AuthGoogleService,
    private readonly authMicrosoftService: AuthMicrosoftService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly userSettingsService: UserSettingsService,
    private readonly mongodbTransactionService: MongodbTransactionService,
    private readonly jwtService: JwtService,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  getGoogleConnectionUrl(payload: AuthGetGoogleConnectionUrlDTO) {
    return this.authGoogleService.getConnectionUrl(payload);
  }

  getGoogleAuthUrl(payload: AuthGetGoogleAuthUrlDTO) {
    return this.authGoogleService.getAuthUrl(payload);
  }

  async getMicrosoftConnectionUrl(payload: AuthGetMicrosoftConnectionUrlDTO) {
    return await this.authMicrosoftService.getConnectionUrl(payload);
  }

  async getMicrosoftAuthUrl(payload: AuthGetMicrosoftAuthUrlDTO) {
    return await this.authMicrosoftService.getAuthUrl(payload);
  }

  async googleAuthCallback(
    payload: AuthGoogleAuthCallbackDTO,
    req: Request,
    res: Response,
  ): Promise<void> {
    const webBase = this.configService.getOrThrow<string>('WEB_BASE');

    try {
      const { code, state } = payload;

      if (!code) {
        throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
      }

      const googleStateFromCookie = req.cookies['google_auth_state'] as
        | string
        | undefined;

      const skipOauthStateCheck = this.configService.getOrThrow<string>(
        'SKIP_OAUTH_STATE_CHECK',
      );
      if (
        skipOauthStateCheck !== 'true' &&
        (!state || !googleStateFromCookie || state !== googleStateFromCookie)
      ) {
        throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
      }

      res.clearCookie('google_auth_state', {
        sameSite: 'lax',
      });

      const googleUser = await this.authGoogleService.login({ code });

      const accessToken = googleUser.accessToken;
      const expiryDate = googleUser.expiryDate;

      if (!accessToken || expiryDate === null || expiryDate === undefined) {
        throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
      }

      const tokens = await this.authUser({
        foreignId: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
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
        res,
      });
      res.redirect(webBase);
    } catch (error) {
      this.logger.error(error);
      res.clearCookie('google_auth_state', { sameSite: 'lax' });
      res.redirect(webBase);
    }
  }

  async microsoftConnectionCallback(
    payload: AuthMicrosoftConnectionCallbackDTO,
    req: Request,
    res: Response,
  ): Promise<void> {
    const settingsUrl = this.configService.getOrThrow<string>('WEB_BASE');

    try {
      const { code, state } = payload;

      if (!code || !state) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      const microsoftStateFromCookie = req.cookies[
        'microsoft_connection_state'
      ] as string | undefined;

      const skipOauthStateCheck = this.configService.getOrThrow<string>(
        'SKIP_OAUTH_STATE_CHECK',
      );
      if (
        skipOauthStateCheck !== 'true' &&
        (!state ||
          !microsoftStateFromCookie ||
          state !== microsoftStateFromCookie)
      ) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      res.clearCookie('microsoft_connection_state', {
        sameSite: 'lax',
      });

      const decodedState = decrypt(state);
      const user = await this.userService.findOneByFilters({
        _id: new Types.ObjectId(decodedState),
      });

      if (!user) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      const redirectUri = this.configService.getOrThrow<string>(
        'MICROSOFT_CONNECTION_REDIRECT_URI',
      );

      const microsoftUser = await this.authMicrosoftService.login({
        code,
        redirectUri,
      });

      const accessToken = microsoftUser.accessToken;
      const expiryDate = microsoftUser.expiryDate;
      const refreshToken = microsoftUser.refreshToken;

      if (
        !refreshToken ||
        !accessToken ||
        expiryDate === null ||
        expiryDate === undefined
      ) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }
      await this.mongodbTransactionService.withTransaction(async (session) => {
        try {
          await this.linkAccount({
            accessToken,
            email: microsoftUser.email,
            expiryDate,
            externalAccountType: ExternalAccountType.MICROSOFT,
            foreignId: microsoftUser.id,
            user,
            refreshToken,
            session,
            connectionFlow: true,
          });
        } catch (error) {
          this.logger.error(error);
          throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
        }
      });
      res.redirect(settingsUrl + '?microsoftConnected=true');
    } catch (error) {
      this.logger.error(error);
      res.clearCookie('microsoft_connection_state', { sameSite: 'lax' });
      res.redirect(settingsUrl + '?microsoftConnected=false');
    }
  }

  async microsoftAuthCallback(
    payload: AuthMicrosoftAuthCallbackDTO,
    req: Request,
    res: Response,
  ): Promise<void> {
    const webBase = this.configService.getOrThrow<string>('WEB_BASE');

    try {
      const { code, state } = payload;

      if (!code) {
        throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
      }

      const microsoftStateFromCookie = req.cookies['microsoft_auth_state'] as
        | string
        | undefined;

      const skipOauthStateCheck = this.configService.getOrThrow<string>(
        'SKIP_OAUTH_STATE_CHECK',
      );
      if (
        skipOauthStateCheck !== 'true' &&
        (!state ||
          !microsoftStateFromCookie ||
          state !== microsoftStateFromCookie)
      ) {
        throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
      }

      res.clearCookie('microsoft_auth_state', {
        sameSite: 'lax',
      });

      const microsoftUser = await this.authMicrosoftService.login({ code });

      const accessToken = microsoftUser.accessToken;
      const expiryDate = microsoftUser.expiryDate;

      if (!accessToken || expiryDate === null || expiryDate === undefined) {
        throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
      }

      const tokens = await this.authUser({
        foreignId: microsoftUser.id,
        email: microsoftUser.email,
        firstName: microsoftUser.firstName,
        lastName: microsoftUser.lastName,
        accessToken,
        refreshToken: microsoftUser.refreshToken,
        expiryDate,
        externalAccountType: ExternalAccountType.MICROSOFT,
      });

      this.setCookie({
        accessToken: tokens.accessToken,
        accessExpiresAt: tokens.accessExpiresAt,
        refreshToken: tokens.refreshToken,
        refreshExpiresAt: tokens.refreshExpiresAt,
        res,
      });
      res.redirect(webBase);
    } catch (error) {
      this.logger.error(error);
      res.clearCookie('microsoft_auth_state', { sameSite: 'lax' });
      res.redirect(webBase);
    }
  }

  async googleConnectionCallback(
    payload: AuthGoogleConnectionCallbackDTO,
    req: Request,
    res: Response,
  ): Promise<void> {
    const webBase = this.configService.getOrThrow<string>('WEB_BASE');

    try {
      const { code, state } = payload;

      if (!code || !state) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      const googleStateFromCookie = req.cookies['google_connection_state'] as
        | string
        | undefined;

      const skipOauthStateCheck = this.configService.getOrThrow<string>(
        'SKIP_OAUTH_STATE_CHECK',
      );
      if (
        skipOauthStateCheck !== 'true' &&
        (!state || !googleStateFromCookie || state !== googleStateFromCookie)
      ) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      res.clearCookie('google_connection_state', {
        sameSite: 'lax',
      });

      const decodedState = decrypt(state);
      const user = await this.userService.findOneByFilters({
        _id: new Types.ObjectId(decodedState),
      });

      if (!user) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      const redirectUri = this.configService.getOrThrow<string>(
        'GOOGLE_CONNECTION_REDIRECT_URI',
      );

      const googleUser = await this.authGoogleService.login({
        code,
        redirectUri,
      });

      const accessToken = googleUser.accessToken;
      const expiryDate = googleUser.expiryDate;
      const refreshToken = googleUser.refreshToken;

      if (
        !refreshToken ||
        !accessToken ||
        expiryDate === null ||
        expiryDate === undefined
      ) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }
      await this.mongodbTransactionService.withTransaction(async (session) => {
        try {
          await this.linkAccount({
            accessToken,
            email: googleUser.email,
            expiryDate,
            externalAccountType: ExternalAccountType.GOOGLE,
            foreignId: googleUser.id,
            user,
            refreshToken,
            session,
            connectionFlow: true,
          });
        } catch (error) {
          this.logger.error(error);
          throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
        }
      });
      res.redirect(webBase + '?googleConnected=true');
    } catch (error) {
      this.logger.error(error);
      res.clearCookie('google_connection_state', { sameSite: 'lax' });
      res.redirect(webBase + '?googleConnected=false');
    }
  }

  private async loginUser(
    payload: AuthUpdateSettingsAndExternalAccountDTO,
  ): Promise<void> {
    const {
      user,
      session,
      accessToken,
      email,
      expiryDate,
      externalAccountType,
      foreignId,
      refreshToken,
    } = payload;

    await this.externalAccountService.updateByFilters(
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
        connected: true,
      },
      { session },
    );
  }

  private async createUser(payload: AuthCreateUserDTO): Promise<UserDocument> {
    const {
      session,
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
      throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
    }

    const externalAccountMongoId = new Types.ObjectId();

    const user = await this.userService.create({}, session);

    await this.userSettingsService.create(
      {
        userId: user._id.toString(),
        primaryExternalAccount: externalAccountMongoId.toString(),
        firstName,
        lastName,
      },
      session,
    );

    await this.userSubscriptionService.createFree({
      userId: user._id.toString(),
      session,
    });

    await this.externalAccountService.create(
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

      session,
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
      session,
      email,
      connectionFlow,
    } = payload;

    const linkError = connectionFlow
      ? ErrorTypes.CONNECTION_FAILED
      : ErrorTypes.LOGIN_FAILED;

    if (!refreshToken) {
      throw new BadRequestException(linkError);
    }

    const existingForeignAccount =
      await this.externalAccountService.findOneByFilters(
        { foreignId },
        { session },
      );

    if (
      existingForeignAccount &&
      existingForeignAccount.userId !== user._id.toString()
    ) {
      throw new BadRequestException(linkError);
    }

    await this.externalAccountService.updateByFilters(
      { foreignId, userId: user._id.toString(), type: externalAccountType },
      {
        foreignId,
        refreshTokenEncrypted: encrypt(refreshToken),
        accessTokenEncrypted: encrypt(accessToken),
        expiryDate,
        email,
        connected: true,
      },
      { session, upsert: true },
    );
  }

  private async authUser(
    payload: AuthAuthUserDTO,
  ): Promise<AuthAuthUserResponseDTO> {
    const { foreignId, email, externalAccountType } = payload;

    const transactionResult =
      await this.mongodbTransactionService.withTransaction(async (session) => {
        const externalAccount =
          await this.externalAccountService.findOneByFilters(
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
          const otherExternalAccount =
            await this.externalAccountService.findOneByFilters(
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

        await this.sessionService.create(
          {
            userId: user._id.toString(),
            accessToken: tokens.accessToken,
            accessExpiresAt: tokens.accessExpiresAt,
            refreshToken: tokens.refreshToken,
            refreshExpiresAt: tokens.refreshExpiresAt,
          },
          session,
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
      throw new BadRequestException(ErrorTypes.RELOG_REQUIRED);
    }

    const now = new Date();
    const oldSession = await this.sessionService.findOneByFilters({
      refreshToken: refreshTokenFromCookie,
      refreshExpiresAt: { $gt: now },
    });

    if (!oldSession) {
      throw new BadRequestException(ErrorTypes.RELOG_REQUIRED);
    }

    const user = await this.userService.findOneByFilters({
      _id: new Types.ObjectId(oldSession.userId),
    });

    if (!user) {
      throw new BadRequestException(ErrorTypes.RELOG_REQUIRED);
    }

    const userDTO = plainToInstance(UserDTO, user, {
      excludeExtraneousValues: true,
    });

    const tokens = await this.getTokens({ user: userDTO });
    const { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt } =
      tokens;

    const session = await this.sessionService.findOneAndUpdateByFilters(
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
      throw new BadRequestException(ErrorTypes.RELOG_REQUIRED);
    }

    this.setCookie({
      accessToken,
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
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

    if (!refreshTokenFromCookie) {
      throw new BadRequestException(ErrorTypes.RELOG_REQUIRED);
    }

    await this.sessionService.deleteOneByFilters({
      userId: user._id.toString(),
      refreshToken: refreshTokenFromCookie,
    });

    this.clearCookie({ res });
  }

  async logoutEverywhere(payload: AuthLogoutEveryWhereDTO): Promise<void> {
    const { user, res } = payload;

    await this.sessionService.deleteManyByFilters({
      userId: user._id.toString(),
    });

    this.clearCookie({ res });
  }

  private setCookie(payload: AuthSetCookie): void {
    const {
      accessToken,
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
      res,
    } = payload;

    res.cookie('access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: accessExpiresAt,
    });

    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: refreshExpiresAt,
    });
  }

  private clearCookie(payload: AuthClearCookieDTO): void {
    const { res } = payload;

    res.clearCookie('access-token', { sameSite: 'lax' });
    res.clearCookie('refresh-token', { sameSite: 'lax' });
  }
}
