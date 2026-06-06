import { Types } from 'mongoose';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';

export class ExternalAccountCreateDTO {
  _id?: Types.ObjectId;
  userId: string;
  foreignId: string;
  email: string;
  type: ExternalAccountType;
  refreshTokenEncrypted: string;
  accessTokenEncrypted: string;
  expiryDate: number;
}
