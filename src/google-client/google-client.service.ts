import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OAuth2Client } from 'google-auth-library';
import { ExternalAccount } from 'src/auth/schemas/external-account.schema';
import {
  GlobalEvent,
  GoogleAccessTokenRefreshedEvent,
} from 'src/enum/global-event.enum';
import { decrypt } from 'src/utils/encrypt';

import { GoogleClientCreateDTO } from './dto/google-client-create.dto';
import { GoogleClientHandleAccessTokenDTO } from './dto/google-client-handle-access-token.dto';

@Injectable()
export class GoogleClientService {
  private readonly logger: Logger = new Logger('GoogleClientService');
  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  create(payload?: GoogleClientCreateDTO) {
    const { refreshToken, accessToken, expiryDate } = payload ?? {};
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');

    const clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');

    const redirectUri = this.config.getOrThrow<string>(
      'GOOGLE_AUTH_REDIRECT_URI',
    );
    const base = this.config.getOrThrow<string>('BASE');
    const port = this.config.getOrThrow<string>('PORT');

    const redirectUrl = `${base}:${port}/${redirectUri}`;

    const client = new OAuth2Client(clientId, clientSecret, redirectUrl);

    client.setCredentials({
      refresh_token: refreshToken,
      access_token: accessToken,
      expiry_date: expiryDate,
    });

    return client;
  }

  async run<T>(
    externalAccount: ExternalAccount,
    fn: (client: OAuth2Client) => Promise<T>,
  ) {
    const accessToken = decrypt(externalAccount.accessTokenEncrypted);
    const refreshToken = decrypt(externalAccount.refreshTokenEncrypted);
    const expiryDate = externalAccount.expiryDate;

    const client = this.create({ refreshToken, accessToken, expiryDate });

    await this.handleRefreshToken({
      accessToken,
      externalAccountId: externalAccount._id.toString(),
      client,
    });

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

  private async handleRefreshToken(payload: GoogleClientHandleAccessTokenDTO) {
    const { accessToken, client, externalAccountId } = payload;
    try {
      await client.getAccessToken();

      const creds = client.credentials;

      if (
        creds.access_token &&
        creds.expiry_date &&
        creds.access_token !== accessToken
      ) {
        const event = new GoogleAccessTokenRefreshedEvent({
          externalAccountId,
          accessToken: creds.access_token,
          expiryDate: creds.expiry_date,
        });

        this.eventEmitter.emit(
          GlobalEvent.GOOGLE_ACCESS_TOKEN_REFRESHED,
          event,
        );
      }
    } catch (e) {
      this.logger.error(e);
      throw new BadRequestException(
        'error.google-client-service.access-token-error',
      );
    }
  }
}
