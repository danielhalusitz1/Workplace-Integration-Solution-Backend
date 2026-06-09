import { ClientSession } from 'mongoose';

export class SessionDeleteDTO {
  userId: string;
  refreshToken: string;
  session?: ClientSession;
}
