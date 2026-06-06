import { ConfigModule } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { setupMongoTestLifecycle } from 'src/test';

import { GoogleClientService } from '../google-client.service';

describe('GoogleClientService', () => {
  const ctx = setupMongoTestLifecycle({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [GoogleClientService],
  });

  let googleClientService: GoogleClientService;

  beforeEach(() => {
    googleClientService = ctx.module.get(GoogleClientService);
  });

  it('creates an OAuth2 client with credentials from payload', () => {
    const client = googleClientService.create({
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
      expiryDate: 1234567890,
    });

    expect(client).toBeInstanceOf(OAuth2Client);
    expect(client.credentials).toEqual(
      expect.objectContaining({
        refresh_token: 'refresh-token',
        access_token: 'access-token',
        expiry_date: 1234567890,
      }),
    );
  });
});
