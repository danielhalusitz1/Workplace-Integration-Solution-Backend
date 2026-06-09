import { IsString } from 'class-validator';

export class AuthGoogleConnectionUrlDTO {
  @IsString()
  webRedirectUri: string;
}
