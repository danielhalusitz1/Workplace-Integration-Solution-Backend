import { IsString } from 'class-validator';

export class AuthGetGoogleConnectionUrlDTO {
  @IsString()
  webRedirectUri: string;
}
