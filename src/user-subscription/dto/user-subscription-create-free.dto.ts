import { ClientSession } from 'mongoose';

export class UserSubscriptionCreateFreeDTO {
  userId: string;
  session?: ClientSession;
}
