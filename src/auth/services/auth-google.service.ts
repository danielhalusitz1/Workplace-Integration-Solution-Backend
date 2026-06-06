import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { Model } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { GoogleClientService } from 'src/google-client/google-client.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { encrypt } from 'src/utils/encrypt';

import { AuthGoogleAuthUrlDTO } from '../dto/auth-google-auth-url.dto';
import { AuthGoogleConnectionUrlDTO } from '../dto/auth-google-connection-url.dto';
import {
  AuthGoogleLoginDTO,
  AuthGoogleLoginResponseDTO,
} from '../dto/auth-google-logn.dto';
import { ExternalAccountType } from '../enum/external-account-type.enum';
import { ExternalAccount } from '../schemas/external-account.schema';

type GoogleUser = {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
};
@Injectable()
export class AuthGoogleService {
  private readonly logger: Logger = new Logger('AuthGoogleService');

  constructor(
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,

    private readonly googleClientService: GoogleClientService,
    private readonly configService: ConfigService,
    private readonly userSettingsService: UserSettingsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async updateAccessTokens() {
    this.logger.log('Start update access tokens');
    const cursor = this.externalAccountModel
      .find({
        type: ExternalAccountType.GOOGLE,
        expiryDate: {
          $lte: Date.now() + 10 * 60 * 1000,
        },
      })
      .lean()
      .cursor();

    let promises: Promise<void>[] = [];
    for await (const googleAccount of cursor) {
      promises.push(this.updateAccessToken(googleAccount));
      if (promises.length === 100) {
        await Promise.allSettled(promises);
        promises = [];
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    this.logger.log('End update access tokens');
  }

  private async updateAccessToken(googleAccount: ExternalAccount) {
    const newCredentials = await this.googleClientService.run(
      googleAccount,
      async (client: OAuth2Client) => {
        const { credentials } = await client.refreshAccessToken();

        return credentials;
      },
    );

    const { access_token, expiry_date, refresh_token } = newCredentials;
    if (!access_token || expiry_date === null || expiry_date === undefined) {
      this.logger.error(`Missing tokens at user: ${googleAccount.userId}`);
      await this.userSettingsService.updateByFilters(
        {
          userId: googleAccount.userId,
          googleConnected: true,
        },
        {
          googleConnected: false,
        },
      );
      return;
    }

    await this.externalAccountModel.updateOne(
      {
        _id: googleAccount._id,
      },
      {
        accessTokenEncrypted: encrypt(access_token),
        ...(refresh_token
          ? { refreshTokenEncrypted: encrypt(refresh_token) }
          : {}),
        expiryDate: expiry_date,
      },
    );
  }

  async login(
    payload: AuthGoogleLoginDTO,
  ): Promise<AuthGoogleLoginResponseDTO> {
    const { code } = payload;
    const client = this.googleClientService.create({
      redirectUri: payload.redirectUri,
    });

    let tokens: Credentials | null = null;

    try {
      const getTokenRes = await client.getToken(code);

      tokens = getTokenRes.tokens;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
    }

    client.setCredentials(tokens);

    let user: GoogleUser | null = null;

    try {
      const userRes = await client.request<GoogleUser>({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });

      user = userRes.data;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
    }

    if (!user) {
      throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.given_name,
      lastName: user.family_name,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
    };
  }

  getConnectionUrl(payload: AuthGoogleConnectionUrlDTO) {
    const { user } = payload;

    const redirectUri = this.configService.getOrThrow<string>(
      'GOOGLE_CONNECTION_REDIRECT_URI',
    );
    const base = this.configService.getOrThrow<string>('BASE');
    const port = this.configService.getOrThrow<string>('PORT');

    const redirectUrl = `${base}:${port}/${redirectUri}`;

    const client = this.googleClientService.create({
      redirectUri,
    });

    const url = client.generateAuthUrl({
      response_type: 'code',
      scope: ['openid', 'email', 'profile'],
      access_type: 'offline',
      redirect_uri: redirectUrl,
      prompt: 'consent',
      state: user._id,
    });

    return url;
  }

  getAuthUrl(payload: AuthGoogleAuthUrlDTO) {
    const { res } = payload;

    const state = crypto.randomUUID();

    res.cookie('google_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
}
