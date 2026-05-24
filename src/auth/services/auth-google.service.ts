import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

import { AuthGoogleLoginDTO } from '../dto/auth-google-logn.dto';

@Injectable()
export class AuthGoogleService {
  private oauthClient: OAuth2Client;

  constructor(private readonly config: ConfigService) {
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');

    const clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');

    const redirectUri = this.config.getOrThrow<string>(
      'GOOGLE_AUTH_REDIRECT_URI',
    );
    const base = this.config.getOrThrow<string>('BASE');
    const port = this.config.getOrThrow<string>('PORT');

    const redirectUrl = `${base}:${port}/${redirectUri}`;

    this.oauthClient = new OAuth2Client(clientId, clientSecret, redirectUrl);
  }

  async login(payload: AuthGoogleLoginDTO) {
    const { code } = payload;
    const getTokenRes = await this.oauthClient.getToken(code);
  }
}
