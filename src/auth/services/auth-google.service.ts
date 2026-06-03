import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Credentials } from 'google-auth-library';
import { GoogleClientService } from 'src/google-client/google-client.service';

import {
  AuthGoogleLoginDTO,
  AuthGoogleLoginResponseDTO,
} from '../dto/auth-google-logn.dto';

type GoogleUser = {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
};
@Injectable()
export class AuthGoogleService {
  private readonly logger: Logger = new Logger('AuthGoogleService');

  constructor(private readonly googleClientService: GoogleClientService) {}

  /*   @Cron(CronExpression.EVERY_10_MINUTES)
  private async updateTokens() {

  } */

  async login(
    payload: AuthGoogleLoginDTO,
  ): Promise<AuthGoogleLoginResponseDTO> {
    const { code } = payload;
    const client = this.googleClientService.create();

    let tokens: Credentials | null = null;

    try {
      const getTokenRes = await client.getToken(code);

      tokens = getTokenRes.tokens;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('error.auth-google-service.login-failed');
    }

    client.setCredentials(tokens);

    let user: GoogleUser | null = null;

    try {
      const userRes = await client.request<GoogleUser>({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      });

      user = userRes.data;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('error.auth-google-service.login-failed');
    }

    if (!user) {
      throw new BadRequestException('error.auth-google-service.login-failed');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.given_name,
      lastName: user.family_name,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
    };
  }
}
