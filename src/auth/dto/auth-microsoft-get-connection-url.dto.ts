import { IsString } from 'class-validator';

export class AuthMicrosoftGetConnectionUrlDTO {
  @IsString()
  webRedirectUri: string;
}
