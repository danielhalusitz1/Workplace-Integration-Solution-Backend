import { ClientSession } from 'mongoose';

export class SessionDeleteManyDTO {
  userId: string;
  session?: ClientSession;
}
