import { IsString } from 'class-validator';

export class AuthGoogleDTO {
  @IsString()
  code: string;
}

export class AuthGoogleResponseDTO {
  accessToken: string;
  refreshToken: string;
}
