import { Injectable } from '@nestjs/common';
import { MicrosoftClientService } from 'src/microsoft-client/microsoft-client.service';

import {
  AuthMicrosoftLoginDTO,
  AuthMicrosoftLoginResponseDTO,
} from '../dto/auth-microsoft-login.dto';
import { AuthMicrosoftUrlDTO } from '../dto/auth-microsoft-url.dto';

@Injectable()
export class AuthMicrosoftService {
  constructor(
    private readonly microsoftClientService: MicrosoftClientService,
  ) {}

  async login(
    payload: AuthMicrosoftLoginDTO,
  ): Promise<AuthMicrosoftLoginResponseDTO> {
    const { code } = payload;

    const authResult = await this.microsoftClientService.login(code);

    const {
      access_token,
      email,
      expires_in,
      givenName,
      id,
      refresh_token,
      surname,
    } = authResult;

    const expiryDate = Date.now() + expires_in * 1000;
    return {
      email,
      firstName: givenName,
      lastName: surname,
      id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiryDate,
    };
  }

  async getAuthUrl(payload: AuthMicrosoftUrlDTO) {
    const { res } = payload;

    const state = crypto.randomUUID();

    res.cookie('google_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    return await this.microsoftClientService.getAuthUrl({ state });
  }
}
