import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Model } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { MicrosoftClientService } from 'src/microsoft-client/microsoft-client.service';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { encrypt } from 'src/utils/encrypt';

import {
  AuthMicrosoftLoginDTO,
  AuthMicrosoftLoginResponseDTO,
} from '../dto/auth-microsoft-login.dto';
import { AuthMicrosoftUrlDTO } from '../dto/auth-microsoft-url.dto';
import { ExternalAccountType } from '../enum/external-account-type.enum';
import { ExternalAccount } from '../schemas/external-account.schema';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type MeResponse = {
  id: string;
  givenName: string;
  surname: string;
  mail?: string;
  otherMails?: string[];
};

@Injectable()
export class AuthMicrosoftService {
  private readonly logger = new Logger(AuthMicrosoftService.name);

  constructor(
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,

    private readonly microsoftClientService: MicrosoftClientService,
    private readonly configService: ConfigService,
    private readonly userSettingsService: UserSettingsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async updateAccessTokens() {
    this.logger.log('Start update access tokens');
    const cursor = this.externalAccountModel
      .find({
        type: ExternalAccountType.MICROSOFT,
        expiryDate: {
          $lte: Date.now() + 10 * 60 * 1000,
        },
      })
      .lean()
      .cursor();

    let promises: Promise<void>[] = [];
    for await (const msAccount of cursor) {
      promises.push(this.updateAccessToken(msAccount));
      if (promises.length === 100) {
        await Promise.allSettled(promises);
        promises = [];
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    this.logger.log('End update access tokens');
  }

  private async updateAccessToken(msAccount: ExternalAccount) {
    try {
      const { accessToken, expiryDate, refreshToken } =
        await this.microsoftClientService.refreshToken(msAccount);

      await this.externalAccountModel.updateOne(
        {
          _id: msAccount._id,
        },
        {
          accessTokenEncrypted: encrypt(accessToken),
          refreshTokenEncrypted: encrypt(refreshToken),
          expiryDate,
        },
      );
    } catch (error) {
      await this.userSettingsService.updateByFilters(
        {
          userId: msAccount.userId,
          microsoftConnected: true,
        },
        {
          microsoftConnected: false,
        },
      );
      throw error;
    }
  }

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

      const { access_token, expires_in, refresh_token } = tokenResponse.data;

      const meResponse = await axios.get<MeResponse>(
        'https://graph.microsoft.com/v1.0/me?$select=id,givenName,surname,mail,otherMails',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        },
      );

      const { givenName, id, surname, mail, otherMails } = meResponse.data;

      const email = mail ?? otherMails?.[0];

      if (!email) {
        throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
      }

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
      throw new BadRequestException(ErrorTypes.LOGIN_FAILED);
    }
  }

  async getAuthUrl(payload: AuthMicrosoftUrlDTO) {
    const { res } = payload;

    const state = crypto.randomUUID();

    res.cookie('microsoft_state', state, {
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
