import { OmitType } from '@nestjs/swagger';

import { User } from '../schemas/user.schema';

export class UserCreateDTO extends OmitType(User, [
  '_id',
  'createdAt',
  'updatedAt',
]) {}
