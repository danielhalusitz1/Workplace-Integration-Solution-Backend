import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccount } from 'src/external-account/schemas/external-account.schema';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { GoogleClientService } from 'src/google-client/services/google-client.service';
import { UserDTO } from 'src/user/dto/user.dto';

import { ExternalAccountType } from '../../external-account/enums/external-account-type.enum';
import { AuthGoogleAuthUrlDTO } from '../dto/auth-google-auth-url.dto';
import { AuthGoogleConnectionUrlDTO } from '../dto/auth-google-connection-url.dto';
import {
  AuthGoogleLoginDTO,
  AuthGoogleLoginResponseDTO,
} from '../dto/auth-google-logn.dto';

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
    private readonly jwtService: JwtService,
    private readonly googleClientService: GoogleClientService,
    private readonly configService: ConfigService,
    private readonly externalAccountService: ExternalAccountService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async updateAccessTokens() {
    this.logger.log('Start update access tokens');
    const cursor = this.externalAccountService.findByFiltersCursor({
      type: ExternalAccountType.GOOGLE,
      connected: true,
      expiryDate: {
        $lte: Date.now() + 10 * 60 * 1000,
      },
    });

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
      await this.externalAccountService.disconnect({
        _id: googleAccount._id.toString(),
      });
      return;
    }

    await this.externalAccountService.connect({
      foreignId: googleAccount.foreignId,
      accessToken: access_token,
      email: googleAccount.email,
      expiryDate: expiry_date,
      refreshToken: refresh_token,
      type: googleAccount.type,
      userId: googleAccount.userId,
    });
  }

  async login(
    payload: AuthGoogleLoginDTO,
  ): Promise<AuthGoogleLoginResponseDTO> {
    const { code } = payload;
    const client = this.googleClientService.create({
      redirectUri: payload.redirectUri,
    });

    let tokens: Credentials | null = null;
    let user: GoogleUser | null = null;

    try {
      const getTokenRes = await client.getToken(code);

      tokens = getTokenRes.tokens;

      client.setCredentials(tokens);

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

  getConnectionUrl(payload: AuthGoogleConnectionUrlDTO, user: UserDTO) {
    const { webRedirectUri } = payload;

    const state = {
      userId: user._id,
      webRedirectUri,
    };

    const stateToken = this.jwtService.sign(state, {
      expiresIn: '5m',
    });

    const redirectUri = this.configService.getOrThrow<string>(
      'GOOGLE_CONNECTION_REDIRECT_URI',
    );
    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');

    const redirectUrl = `${baseUrl}/${redirectUri}`;

    const client = this.googleClientService.create({
      redirectUri,
    });

    const url = client.generateAuthUrl({
      response_type: 'code',
      scope: ['openid', 'email', 'profile'],
      access_type: 'offline',
      prompt: 'consent',
      redirect_uri: redirectUrl,
      state: stateToken,
    });

    return url;
  }

  getAuthUrl(payload: AuthGoogleAuthUrlDTO) {
    const { res } = payload;

    const state = crypto.randomUUID();

    res.cookie('google_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    const client = this.googleClientService.create();

    const redirectUri = this.configService.getOrThrow<string>(
      'GOOGLE_AUTH_REDIRECT_URI',
    );
    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');

    const redirectUrl = `${baseUrl}/${redirectUri}`;

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
