import { OmitType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { User } from '../schemas/user.schema';

export class UserCreateDTO extends OmitType(User, [
  '_id',
  'createdAt',
  'updatedAt',
]) {
  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  microsoftId?: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  userSettingsId: string;
}
