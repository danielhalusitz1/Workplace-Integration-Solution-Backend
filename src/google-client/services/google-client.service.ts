import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccount } from 'src/external-account/schemas/external-account.schema';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { decrypt } from 'src/utils/encrypt';

import { GoogleClientCreateDTO } from '../dto/google-client-create.dto';

@Injectable()
export class GoogleClientService {
  private readonly logger: Logger = new Logger('GoogleClientService');
  constructor(
    private readonly externalAccountService: ExternalAccountService,
    private readonly userSettingsService: UserSettingsService,
    private readonly config: ConfigService,
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

        await this.externalAccountService.disconnect({
          _id: externalAccount._id.toString(),
        });

        const userSettings = await this.userSettingsService.findOneByFilters({
          primaryExternalAccount: externalAccount._id.toString(),
        });

        if (userSettings) {
          throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
        } else {
          throw new UnauthorizedException(ErrorTypes.RECONNECT_REQUIRED);
        }
      }
      throw e;
    }
  }
}
