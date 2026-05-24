import { IsString } from 'class-validator';

export class AuthGoogleLoginDTO {
  @IsString()
  code: string;
}
