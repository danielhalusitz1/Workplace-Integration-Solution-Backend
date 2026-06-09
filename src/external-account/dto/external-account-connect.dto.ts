import { ClientSession, Types } from 'mongoose';

import { ExternalAccountType } from '../enums/external-account-type.enum';

export class ExternalAccountConnectDTO {
  _id?: Types.ObjectId;
  userId: string;
  foreignId: string;
  email: string;
  type: ExternalAccountType;
  accessToken: string;
  refreshToken?: string | null;
  expiryDate: number;
  session?: ClientSession;
}
