import { IsString } from 'class-validator';

export class AuthGetMicrosoftConnectionUrlDTO {
  @IsString()
  webRedirectUri: string;
}
