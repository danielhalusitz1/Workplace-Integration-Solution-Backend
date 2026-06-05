import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { MicrosoftClientService } from 'src/microsoft-client/microsoft-client.service';

import {
  AuthMicrosoftLoginDTO,
  AuthMicrosoftLoginResponseDTO,
} from '../dto/auth-microsoft-login.dto';
import { AuthMicrosoftUrlDTO } from '../dto/auth-microsoft-url.dto';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token: string;
};

type IdTokenDecoded = {
  email: string;
};

type MeResponse = {
  id: string;
  givenName: string;
  surname: string;
};

@Injectable()
export class AuthMicrosoftService {
  private readonly logger = new Logger(AuthMicrosoftService.name);

  constructor(
    private readonly microsoftClientService: MicrosoftClientService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    payload: AuthMicrosoftLoginDTO,
  ): Promise<AuthMicrosoftLoginResponseDTO> {
    const { code } = payload;

    const clientId = this.configService.getOrThrow<string>(
      'MICROSOFT_CLIENT_ID',
    );
    const clientSecret = this.configService.getOrThrow<string>(
      'MICROSOFT_CLIENT_SECRET',
    );
    const tenantId = this.configService.getOrThrow<string>(
      'MICROSOFT_TENANT_ID',
    );

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getRedirectUrl(),
    });

    try {
      const tokenResponse = await axios.post<TokenResponse>(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, expires_in, id_token, refresh_token } =
        tokenResponse.data;

      const userData = jwtDecode<IdTokenDecoded>(id_token);

      const { email } = userData;

      const meResponse = await axios.get<MeResponse>(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        },
      );

      const { givenName, id, surname } = meResponse.data;

      return {
        id,
        email,
        firstName: givenName,
        lastName: surname,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiryDate: Date.now() + expires_in * 1000,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(
        'error.auth-microsoft-service.login-failed',
      );
    }
  }

  async getAuthUrl(payload: AuthMicrosoftUrlDTO) {
    const { res } = payload;

    const state = crypto.randomUUID();

    res.cookie('google_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    return await this.microsoftClientService.msalClient.getAuthCodeUrl({
      scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
      state,
      redirectUri: this.getRedirectUrl(),
    });
  }

  private getRedirectUrl() {
    const redirectUri = this.configService.getOrThrow<string>(
      'MICROSOFT_AUTH_REDIRECT_URI',
    );
    const base = this.configService.getOrThrow<string>('BASE');
    const port = this.configService.getOrThrow<string>('PORT');

    return `${base}:${port}/${redirectUri}`;
  }
}
