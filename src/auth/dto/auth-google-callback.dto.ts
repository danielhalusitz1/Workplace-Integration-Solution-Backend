import { IsString } from 'class-validator';

export class AuthGoogleCallbackDTO {
  @IsString()
  code: string;
}
