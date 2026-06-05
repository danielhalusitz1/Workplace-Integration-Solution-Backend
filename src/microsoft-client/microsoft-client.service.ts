import { ConfidentialClientApplication } from '@azure/msal-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalAccount } from 'src/auth/schemas/external-account.schema';
import { decrypt } from 'src/utils/encrypt';

@Injectable()
export class MicrosoftClientService {
  private readonly logger: Logger = new Logger(MicrosoftClientService.name);

  public msalClient: ConfidentialClientApplication;

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

    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  async run<T>(
    externalAccount: ExternalAccount,
    //fn: (client: OAuth2Client) => Promise<T>,
  ) {
    const accessToken = decrypt(externalAccount.accessTokenEncrypted);
    const refreshToken = decrypt(externalAccount.refreshTokenEncrypted);
    const expiryDate = externalAccount.expiryDate;

    //const client = this.create({ refreshToken, accessToken, expiryDate });
    /* 
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
    } */
  }
}
