import { IsOptional, IsString } from 'class-validator';

export class AuthCreateUserDTO {
  @IsString()
  id: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  refreshToken: string;
}
