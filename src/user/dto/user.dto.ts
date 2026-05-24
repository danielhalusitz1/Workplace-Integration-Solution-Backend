import { IsOptional, IsString } from 'class-validator';

export class UserDTO {
  @IsString()
  _id: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  microsoftId?: string;

  @IsString()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
