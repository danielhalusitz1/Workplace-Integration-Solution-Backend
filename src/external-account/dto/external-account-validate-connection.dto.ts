import { ClientSession } from 'mongoose';

import { ExternalAccountType } from '../enums/external-account-type.enum';

export class ValidateConnectionDTO {
  userId: string;
  type: ExternalAccountType;
  session?: ClientSession;
}
