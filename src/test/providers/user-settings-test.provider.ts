import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { UserSettingsCreateDTO } from 'src/user-settings/dto/user-settings-create.dto';
import {
  UserSettings,
  UserSettingsDocument,
} from 'src/user-settings/schemas/user-settings.schema';

import {
  defaultUserSettingsCreate,
  defaultUserSettingsDocumentOverrides,
} from '../defaults/default-test-payloads';

@Injectable()
export class UserSettingsTestProvider {
  constructor(
    @InjectModel(UserSettings.name)
    private readonly userSettingsModel: Model<UserSettings>,
  ) {}

  async create(
    overrides: Partial<UserSettingsCreateDTO> = {},
  ): Promise<UserSettingsDocument> {
    return (
      await this.userSettingsModel.create([
        defaultUserSettingsCreate(overrides),
      ])
    )[0];
  }

  async updateByUserId(
    userId: string,
    overrides: UpdateQuery<UserSettings> = {},
  ): Promise<UserSettingsDocument | null> {
    return this.userSettingsModel.findOneAndUpdate(
      { userId },
      { ...defaultUserSettingsDocumentOverrides(), ...overrides },
      { new: true },
    );
  }

  async findByUserId(userId: string): Promise<UserSettingsDocument | null> {
    return this.userSettingsModel.findOne({ userId });
  }
}
