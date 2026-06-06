import { Types } from 'mongoose';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';
import { UserCreateDTO } from 'src/user/dto/user-create.dto';
import { UserSettingsCreateDTO } from 'src/user-settings/dto/user-settings-create.dto';
import { Language } from 'src/user-settings/enums/language.enum';

import { encrypt } from '../../utils/encrypt';

export function defaultUserCreate(
  overrides: Partial<UserCreateDTO> = {},
): UserCreateDTO {
  return {
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };
}

export function defaultUserSettingsCreate(
  overrides: Partial<UserSettingsCreateDTO> = {},
): UserSettingsCreateDTO {
  return {
    userId: new Types.ObjectId().toString(),
    primaryExternalAccount: new Types.ObjectId().toString(),
    ...overrides,
  };
}

export function defaultSessionCreate(
  overrides: Partial<{
    userId: string;
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: Date;
    refreshExpiresAt: Date;
  }> = {},
) {
  const now = Date.now();

  return {
    userId: new Types.ObjectId().toString(),
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    accessExpiresAt: new Date(now + 60 * 60 * 1000),
    refreshExpiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

export function defaultExternalAccountCreate(
  overrides: Partial<{
    userId: string;
    foreignId: string;
    email: string;
    type: ExternalAccountType;
    refreshTokenEncrypted: string;
    accessTokenEncrypted: string;
    expiryDate: number;
  }> = {},
) {
  return {
    userId: new Types.ObjectId().toString(),
    foreignId: `foreign-${new Types.ObjectId().toString()}`,
    email: 'test@example.com',
    type: ExternalAccountType.GOOGLE,
    refreshTokenEncrypted: encrypt('test-refresh-token'),
    accessTokenEncrypted: encrypt('test-access-token'),
    expiryDate: Date.now() + 60 * 60 * 1000,
    ...overrides,
  };
}

export function defaultUserSettingsDocumentOverrides(
  overrides: Partial<{
    language: Language;
  }> = {},
) {
  return {
    language: Language.EN,
    ...overrides,
  };
}
