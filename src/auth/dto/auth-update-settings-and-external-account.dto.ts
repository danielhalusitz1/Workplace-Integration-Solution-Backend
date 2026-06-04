import { ClientSession } from 'mongoose';
import { UserDocument } from 'src/user/schemas/user.schema';

import { ExternalAccountType } from '../enum/external-account-type.enum';

export class AuthUpdateSettingsAndExternalAccountDTO {
  user: UserDocument;
  session: ClientSession;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  externalAccountType: ExternalAccountType;
  foreignId: string;
  email: string;
  refreshToken?: string | null;
  accessToken: string;
  expiryDate: number;
}
