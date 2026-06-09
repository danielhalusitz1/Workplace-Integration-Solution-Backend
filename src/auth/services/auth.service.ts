import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { decrypt } from 'src/utils/encrypt';

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
import { AuthGoogleAuthCallbackDTO } from '../dto/auth-google-auth-callback.dto';
import { AuthGoogleConnectionCallbackDTO } from '../dto/auth-google-connection-callback.dto';
import { AuthLogoutDTO } from '../dto/auth-logout.dto';
import { AuthLogoutEveryWhereDTO } from '../dto/auth-logout-everywhere.dto';
import { AuthMicrosoftAuthCallbackDTO } from '../dto/auth-microsoft-auth-callback.dto';
import { AuthMicrosoftConnectionCallbackDTO } from '../dto/auth-microsoft-connection-callback.dto';
import { AuthSetCookie } from '../dto/auth-set-cookie.dto';
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
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  getGoogleConnectionUrl(
    payload: AuthGetGoogleConnectionUrlDTO,
    user: UserDTO,
    res: Response,
  ) {
    return this.authGoogleService.getConnectionUrl(payload, user, res);
  }

  getGoogleAuthUrl(payload: AuthGetGoogleAuthUrlDTO) {
    return this.authGoogleService.getAuthUrl(payload);
  }

  async getMicrosoftConnectionUrl(
    payload: AuthGetMicrosoftConnectionUrlDTO,
    user: UserDTO,
    res: Response,
  ) {
    return await this.authMicrosoftService.getConnectionUrl(payload, user, res);
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
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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
      res.clearCookie('google_auth_state', {
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      const supportedErrorMessages = [
        ErrorTypes.LOGIN_FAILED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_VALIDATE_CONNECTION_LIMIT_LIMIT_REACHED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_BANNED.toString(),
      ];
      if (supportedErrorMessages.includes(error.message as string)) {
        res.redirect(`${webBase}?auth_result=${error.message}`);
      } else {
        res.redirect(`${webBase}?auth_result=${ErrorTypes.LOGIN_FAILED}`);
      }
    }
  }

  async microsoftConnectionCallback(
    payload: AuthMicrosoftConnectionCallbackDTO,
    req: Request,
    res: Response,
  ): Promise<void> {
    const microsoftWebRedirectUriFromCookie = req.cookies[
      'microsoft_connection_web_redirect_uri'
    ] as string;

    res.clearCookie('microsoft_connection_web_redirect_uri', {
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

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
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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

      if (!accessToken || expiryDate === null || expiryDate === undefined) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      await this.mongodbTransactionService.withTransaction(async (session) => {
        await this.externalAccountService.connect({
          foreignId: microsoftUser.id,
          accessToken,
          email: microsoftUser.email,
          expiryDate,
          refreshToken,
          type: ExternalAccountType.MICROSOFT,
          userId: user._id.toString(),
          session,
        });
      });
      res.redirect(
        `${microsoftWebRedirectUriFromCookie}?account_connection_result=success`,
      );
    } catch (error) {
      this.logger.error(error);
      res.clearCookie('microsoft_connection_state', {
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      const supportedErrorMessages = [
        ErrorTypes.CONNECTION_FAILED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_VALIDATE_CONNECTION_LIMIT_LIMIT_REACHED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_BANNED.toString(),
      ];
      if (supportedErrorMessages.includes(error.message as string)) {
        res.redirect(
          `${microsoftWebRedirectUriFromCookie}?account_connection_result=${error.message}`,
        );
      } else {
        res.redirect(
          `${microsoftWebRedirectUriFromCookie}?account_connection_result=unknown-error`,
        );
      }
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
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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
      res.clearCookie('microsoft_auth_state', {
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      res.redirect(webBase + `/welcome?auth_result=${ErrorTypes.LOGIN_FAILED}`);

      const supportedErrorMessages = [
        ErrorTypes.LOGIN_FAILED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_VALIDATE_CONNECTION_LIMIT_LIMIT_REACHED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_BANNED.toString(),
      ];
      if (supportedErrorMessages.includes(error.message as string)) {
        res.redirect(`${webBase}?auth_result=${error.message}`);
      } else {
        res.redirect(`${webBase}?auth_result=${ErrorTypes.LOGIN_FAILED}`);
      }
    }
  }

  async googleConnectionCallback(
    payload: AuthGoogleConnectionCallbackDTO,
    req: Request,
    res: Response,
  ): Promise<void> {
    const googleWebRedirectUriFromCookie = req.cookies[
      'google_connection_web_redirect_uri'
    ] as string;

    res.clearCookie('google_connection_web_redirect_uri', {
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

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
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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

      if (!accessToken || expiryDate === null || expiryDate === undefined) {
        throw new BadRequestException(ErrorTypes.CONNECTION_FAILED);
      }

      await this.mongodbTransactionService.withTransaction(async (session) => {
        await this.externalAccountService.connect({
          foreignId: googleUser.id,
          accessToken,
          email: googleUser.email,
          expiryDate,
          refreshToken,
          type: ExternalAccountType.GOOGLE,
          userId: user._id.toString(),
          session,
        });
      });
      res.redirect(
        `${googleWebRedirectUriFromCookie}?account_connection_result=success`,
      );
    } catch (error) {
      this.logger.error(error);
      res.clearCookie('google_connection_state', {
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      const supportedErrorMessages = [
        ErrorTypes.CONNECTION_FAILED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_VALIDATE_CONNECTION_LIMIT_LIMIT_REACHED.toString(),
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_BANNED.toString(),
      ];
      if (supportedErrorMessages.includes(error.message as string)) {
        res.redirect(
          `${googleWebRedirectUriFromCookie}?account_connection_result=${error.message}`,
        );
      } else {
        res.redirect(
          `${googleWebRedirectUriFromCookie}?account_connection_result=unknown-error`,
        );
      }
    }
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

    await this.externalAccountService.connect({
      _id: externalAccountMongoId,
      foreignId,
      refreshToken,
      accessToken,
      expiryDate,
      userId: user._id.toString(),
      type: externalAccountType,
      email,
      session,
    });

    return user;
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
          await this.externalAccountService.connect({
            userId: user._id.toString(),
            foreignId,
            type: externalAccountType,
            accessToken: payload.accessToken,
            email: email,
            expiryDate: payload.expiryDate,
            refreshToken: payload.refreshToken,
            session,
          });
        } else {
          const otherExternalAccount =
            await this.externalAccountService.findOneByFilters(
              {
                email,
                type: { $ne: externalAccountType },
                connected: true,
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
            await this.externalAccountService.connect({
              foreignId,
              accessToken: payload.accessToken,
              email,
              expiryDate: payload.expiryDate,
              refreshToken: payload.refreshToken,
              type: externalAccountType,
              userId: user._id.toString(),
              session,
            });
          } else {
            user = await this.createUser({ ...payload, session });
          }
        }

        const userDTO = plainToInstance(UserDTO, user, {
          excludeExtraneousValues: true,
        });

        const authSession = await this.sessionService.create({
          user: userDTO,
          session,
        });

        return {
          accessToken: authSession.accessToken,
          refreshToken: authSession.refreshToken,
          accessExpiresAt: authSession.accessExpiresAt,
          refreshExpiresAt: authSession.refreshExpiresAt,
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

    try {
      const session = await this.sessionService.update({
        user: userDTO,
        oldRefreshToken: refreshTokenFromCookie,
      });

      this.setCookie({
        accessToken: session.accessToken,
        accessExpiresAt: session.accessExpiresAt,
        refreshToken: session.refreshToken,
        refreshExpiresAt: session.refreshExpiresAt,
        res,
      });
    } catch {
      throw new BadRequestException(ErrorTypes.RELOG_REQUIRED);
    }
  }

  async logout(payload: AuthLogoutDTO): Promise<void> {
    const { user, req, res } = payload;

    const refreshTokenFromCookie = req.cookies['refresh-token'] as
      | string
      | undefined;

    if (!refreshTokenFromCookie) {
      throw new BadRequestException(ErrorTypes.RELOG_REQUIRED);
    }

    await this.sessionService.deleteOne({
      userId: user._id.toString(),
      refreshToken: refreshTokenFromCookie,
    });

    this.clearCookie({ res });
  }

  async logoutEverywhere(payload: AuthLogoutEveryWhereDTO): Promise<void> {
    const { user, res } = payload;

    await this.sessionService.deleteMany({
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

    res.clearCookie('access-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refresh-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
}
