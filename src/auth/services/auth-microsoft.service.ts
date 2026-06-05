import { Injectable } from '@nestjs/common';
import { MicrosoftClientService } from 'src/microsoft-client/microsoft-client.service';

import { AuthMicrosoftUrlDTO } from '../dto/auth-microsoft-url.dto';

@Injectable()
export class AuthMicrosoftService {
  constructor(
    private readonly microsoftClientService: MicrosoftClientService,
  ) {}

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
