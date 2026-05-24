import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleClientService {
  private readonly logger: Logger = new Logger('GoogleClientService');
  constructor(private readonly config: ConfigService) {}

  create(refreshToken?: string) {
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');

    const clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');

    const redirectUri = this.config.getOrThrow<string>(
      'GOOGLE_AUTH_REDIRECT_URI',
    );
    const base = this.config.getOrThrow<string>('BASE');
    const port = this.config.getOrThrow<string>('PORT');

    const redirectUrl = `${base}:${port}/${redirectUri}`;

    const client = new OAuth2Client(clientId, clientSecret, redirectUrl);

    if (refreshToken) {
      client.setCredentials({ refresh_token: refreshToken });
    }

    return client;
  }

  async run<T>(refreshToken: string, fn: (client: OAuth2Client) => Promise<T>) {
    const client = this.create(refreshToken);

    try {
      return await fn(client);
    } catch (e) {
      if (e.response?.data?.error === 'invalid_grant') {
        this.logger.error(e);

        throw new UnauthorizedException(
          'error.google-client-service.reconnect-required',
        );
      }
      throw e;
    }
  }
}
