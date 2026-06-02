import { Type } from 'class-transformer';
import { IsString } from 'class-validator';
import { OAuth2Client } from 'google-auth-library';
export class GoogleClientHandleRefreshTokenDTO {
  @IsString()
  accessToken: string;

  @IsString()
  externalAccountId: string;

  @Type(() => OAuth2Client)
  client: OAuth2Client;
}
