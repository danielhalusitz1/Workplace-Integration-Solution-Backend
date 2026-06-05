import { ConfidentialClientApplication } from '@azure/msal-node';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

import { MicrosoftClientExchangeCodeResponse } from './dto/microsoft-client-exchange-code.dto';
import { MicrosoftClientGetAuthUrlDTO } from './dto/microsoft-client-get-auth-url.dto';

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
export class MicrosoftClientService {
  private readonly logger: Logger = new Logger(MicrosoftClientService.name);

  private client: ConfidentialClientApplication;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.getOrThrow<string>(
      'MICROSOFT_CLIENT_ID',
    );
    const clientSecret = this.configService.getOrThrow<string>(
      'MICROSOFT_CLIENT_SECRET',
    );
    const tenantId = this.configService.getOrThrow<string>(
      'MICROSOFT_TENANT_ID',
    );

    this.client = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  getClient() {
    return this.client;
  }

  authRequest() {
    const redirectUri = this.configService.getOrThrow<string>(
      'MICROSOFT_AUTH_REDIRECT_URI',
    );
    const base = this.configService.getOrThrow<string>('BASE');
    const port = this.configService.getOrThrow<string>('PORT');

    const redirectUrl = `${base}:${port}/${redirectUri}`;

    return {
      scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
      redirectUri: redirectUrl,
    };
  }

  async getAuthUrl(payload: MicrosoftClientGetAuthUrlDTO) {
    const { state } = payload;
    return this.client.getAuthCodeUrl({
      ...this.authRequest(),
      state,
    });
  }

  async login(code: string): Promise<MicrosoftClientExchangeCodeResponse> {
    const defaults = this.authRequest();

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
      redirect_uri: defaults.redirectUri,
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

      const userData = jwtDecode<IdTokenDecoded>(tokenResponse.data.id_token);

      const meResponse = await axios.get<MeResponse>(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        },
      );

      return {
        ...tokenResponse.data,
        ...meResponse.data,
        email: userData.email,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(
        'error.microsoft-client-service.login-failed',
      );
    }
  }
}
