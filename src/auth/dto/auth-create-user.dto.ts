import { ClientSession } from 'mongoose';

import { ExternalAccountType } from '../enum/external-account-type.enum';

export class AuthCreateUserDTO {
  session: ClientSession;
  externalAccountType: ExternalAccountType;
  foreignId: string;
  email: string;
  refreshToken?: string | null;
  accessToken: string;
  expiryDate: number;
  firstName?: string;
  lastName?: string;
}
