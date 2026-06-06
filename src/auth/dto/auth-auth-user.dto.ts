import { ExternalAccountType } from '../enum/external-account-type.enum';

export class AuthAuthUserDTO {
  foreignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  refreshToken?: string | null;
  accessToken: string;
  expiryDate: number;
  externalAccountType: ExternalAccountType;
}

export class AuthAuthUserResponseDTO {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}
