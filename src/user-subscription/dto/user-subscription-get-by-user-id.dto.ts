import { ClientSession } from 'mongoose';

export class UserSubscriptionGetByUserIdDTO {
  userId: string;
  session?: ClientSession;
}
