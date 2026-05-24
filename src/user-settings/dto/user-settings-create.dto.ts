import { IsBoolean } from 'class-validator';

export class UserSettingsCreateDTO {
  @IsBoolean()
  googleConnected: boolean;

  @IsBoolean()
  microsoftConnected: boolean;
}
