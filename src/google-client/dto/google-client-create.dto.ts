import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GoogleClientCreateDTO {
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsNumber()
  @IsOptional()
  expiryDate?: number;
}
