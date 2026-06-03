import { User } from 'src/user/schemas/user.schema';

import { ExternalAccountType } from '../enum/external-account-type.enum';

export class AuthAuthUserDTO {
  user: User | null;
  foreignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  refreshToken: string;
  accessToken: string;
  expiryDate: number;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  googleId?: string;
  microsoftId?: string;
  extednalAccountType: ExternalAccountType;
}
