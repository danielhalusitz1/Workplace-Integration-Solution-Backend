import { ConfidentialClientApplication } from '@azure/msal-node';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccount } from 'src/external-account/schemas/external-account.schema';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { decrypt } from 'src/utils/encrypt';

type MicrosoftClient = {
  get: <T>(url: string) => Promise<T>;
  post: <T>(url: string, body: unknown) => Promise<T>;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token: string;
};

@Injectable()
export class MicrosoftClientService {
  private readonly logger: Logger = new Logger(MicrosoftClientService.name);

  public msalClient: ConfidentialClientApplication;

  constructor(
    private readonly externalAccountService: ExternalAccountService,
    private readonly configService: ConfigService,
    private readonly userSettingsService: UserSettingsService,
  ) {
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

  private async get<T>(url: string, accessToken: string): Promise<T> {
    const response: AxiosResponse<T> = await axios.get<T>(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  private async post<T, B = unknown>(
    url: string,
    body: B,
    accessToken: string,
  ): Promise<T> {
    const response: AxiosResponse<T> = await axios.post<T>(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  async run<T>(
    externalAccount: ExternalAccount,
    fn: (client: MicrosoftClient) => Promise<T>,
  ): Promise<T> {
    const createClient = (token: string): MicrosoftClient => ({
      get: <R>(url: string) => this.get<R>(url, token),
      post: <R>(url: string, body: unknown) => this.post<R>(url, body, token),
    });

    try {
      let accessToken = decrypt(externalAccount.accessTokenEncrypted);

      const expired = externalAccount.expiryDate <= Date.now() + 5 * 60 * 1000;

      if (expired) {
        const refreshed = await this.refreshTokens(externalAccount);
        accessToken = refreshed.accessToken;
      }

      return await fn(createClient(accessToken));
    } catch (error) {
      if (error?.response?.status !== 401) {
        throw error;
      }

      try {
        const refreshed = await this.refreshTokens(externalAccount);

        return await fn(createClient(refreshed.accessToken));
      } catch (refreshError) {
        this.logger.error(refreshError);

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
    }
  }

  async refreshTokens(externalAccount: ExternalAccount): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
  }> {
    const refreshToken = decrypt(externalAccount.refreshTokenEncrypted);

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
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const { data } = await axios.post<TokenResponse>(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      body,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const newAccessToken = data.access_token;

    const newRefreshToken = data.refresh_token ?? refreshToken;

    const expiryDate = Date.now() + data.expires_in * 1000;

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiryDate,
    };
  }
}
