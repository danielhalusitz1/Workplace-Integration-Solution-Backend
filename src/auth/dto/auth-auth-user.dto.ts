import { ClientSession } from 'mongoose';
import { ExternalAccount } from 'src/external-account/schemas/external-account.schema';

import { ExternalAccountType } from '../../external-account/enums/external-account-type.enum';

export class AuthAuthUserDTO {
  foreignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  refreshToken?: string | null;
  accessToken: string;
  expiryDate: number;
  externalAccountType: ExternalAccountType;
  session: ClientSession;
}

export class AuthAuthUserResponseDTO {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
  externalAccount: ExternalAccount;
  runBackfillJobs: boolean;
}
