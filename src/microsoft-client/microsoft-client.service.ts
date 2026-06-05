import { ConfidentialClientApplication } from '@azure/msal-node';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MicrosoftClientGetAuthUrlDTO } from './dto/microsoft-client-get-auth-url.dto';

@Injectable()
export class MicrosoftClientService {
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
}
