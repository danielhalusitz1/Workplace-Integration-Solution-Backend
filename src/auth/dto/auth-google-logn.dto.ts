import { IsString } from 'class-validator';

export class AuthGoogleLoginDTO {
  @IsString()
  code: string;
}

export class AuthGoogleLoginResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  expiryDate?: number | null;
}
