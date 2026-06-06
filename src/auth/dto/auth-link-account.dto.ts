import { ClientSession } from 'mongoose';
import { UserDocument } from 'src/user/schemas/user.schema';

import { ExternalAccountType } from '../../external-account/enums/external-account-type.enum';

export class AuthLinkAccountDTO {
  refreshToken?: string | null;
  foreignId: string;
  accessToken: string;
  expiryDate: number;
  user: UserDocument;
  externalAccountType: ExternalAccountType;
  session: ClientSession;
  email: string;
  connectionFlow?: boolean;
}
