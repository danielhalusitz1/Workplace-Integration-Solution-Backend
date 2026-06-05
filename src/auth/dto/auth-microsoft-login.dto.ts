export class AuthMicrosoftLoginDTO {
  code: string;
}

export class AuthMicrosoftLoginResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  expiryDate?: number | null;
}
