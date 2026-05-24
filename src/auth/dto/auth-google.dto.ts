import { IsString } from 'class-validator';

export class AuthGoogleDTO {
  @IsString()
  code: string;
}
