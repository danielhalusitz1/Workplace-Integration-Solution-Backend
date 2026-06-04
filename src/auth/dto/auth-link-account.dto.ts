import { ClientSession } from 'mongoose';
import { UserDocument } from 'src/user/schemas/user.schema';

import { ExternalAccountType } from '../enum/external-account-type.enum';

export class AuthLinkAccountDTO {
  refreshToken?: string | null;
  foreignId: string;
  accessToken: string;
  expiryDate: number;
  user: UserDocument;
  externalAccountType: ExternalAccountType;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  session: ClientSession;
  email: string;
}
