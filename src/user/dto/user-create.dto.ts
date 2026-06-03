import { OmitType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { User } from '../schemas/user.schema';

export class UserCreateDTO extends OmitType(User, [
  '_id',
  'createdAt',
  'updatedAt',
]) {
  googleId?: string;
  microsoftId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userSettingsId: string;
}
