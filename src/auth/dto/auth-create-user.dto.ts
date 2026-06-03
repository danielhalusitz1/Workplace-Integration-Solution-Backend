export class AuthCreateUserDTO {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  refreshToken: string;
}
