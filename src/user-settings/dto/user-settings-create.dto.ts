export class UserSettingsCreateDTO {
  userId: string;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  primaryExternalAccount: string;
}
