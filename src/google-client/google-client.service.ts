import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { ExternalAccount } from 'src/auth/schemas/external-account.schema';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { decrypt } from 'src/utils/encrypt';

import { GoogleClientCreateDTO } from './dto/google-client-create.dto';

@Injectable()
export class GoogleClientService {
  private readonly logger: Logger = new Logger('GoogleClientService');
  constructor(
    private readonly config: ConfigService,
    private readonly userSettingsService: UserSettingsService,
  ) {}

  create(payload?: GoogleClientCreateDTO): OAuth2Client {
    const { refreshToken, accessToken, expiryDate } = payload ?? {};
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');

    const clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');

    const redirectUri =
      payload?.redirectUri ??
      this.config.getOrThrow<string>('GOOGLE_AUTH_REDIRECT_URI');

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

    try {
      return await fn(client);
    } catch (e) {
      if (e.response?.data?.error === 'invalid_grant') {
        this.logger.error(e);

        const userSettings = await this.userSettingsService.updateByFilters(
          {
            userId: externalAccount.userId,
            googleConnected: true,
          },
          {
            googleConnected: false,
          },
        );

        if (!userSettings) {
          throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
        }

        if (
          userSettings.primaryExternalAccount === externalAccount._id.toString()
        ) {
          throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
        } else {
          throw new UnauthorizedException(ErrorTypes.RECONNECT_REQUIRED);
        }
      }
      throw e;
    }
  }
}
