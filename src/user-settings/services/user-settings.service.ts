import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Model,
  QueryFilter,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { UserDTO } from 'src/user/dto/user.dto';

import { UserSettingsCreateDTO } from '../dto/user-settings-create.dto';
import { UserSettingsSetLanguageDTO } from '../dto/user-settings-set-language.dto';
import { UserSettingsSetThemeDTO } from '../dto/user-settings-set-theme.dto';
import {
  UserSettings,
  UserSettingsDocument,
} from '../schemas/user-settings.schema';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectModel(UserSettings.name)
    private readonly userSettingsModel: Model<UserSettings>,
  ) {}

  async create(
    payload: UserSettingsCreateDTO,
    session?: ClientSession,
  ): Promise<UserSettingsDocument> {
    return (await this.userSettingsModel.create([payload], { session }))[0];
  }

  async setTheme(
    payload: UserSettingsSetThemeDTO,
    user: UserDTO,
  ): Promise<UserSettingsDocument> {
    const { theme } = payload;
    const userSettings = await this.updateByFilters(
      { userId: user._id },
      { theme },
      { returnDocument: 'after' },
    );

    if (!userSettings) {
      throw new BadRequestException(
        ErrorTypes.USER_SETTINGS_SERVICE_SET_THEME_NOT_SUCCESS,
      );
    }

    return userSettings;
  }

  async setLanguage(
    payload: UserSettingsSetLanguageDTO,
    user: UserDTO,
  ): Promise<UserSettingsDocument> {
    const userSettings = await this.userSettingsModel.findOneAndUpdate(
      { userId: user._id },
      { language: payload.language },
      { returnDocument: 'after' },
    );

    if (!userSettings) {
      throw new BadRequestException(
        ErrorTypes.USER_SETTINGS_SERVICE_SET_LANGUAGE_NOT_SUCCESS,
      );
    }

    return userSettings;
  }

  async findOneByFilters(
    filters: QueryFilter<UserSettings>,
    options?: QueryOptions<UserSettings>,
  ): Promise<UserSettingsDocument | null> {
    return await this.userSettingsModel.findOne(filters, null, options);
  }

  async updateByFilters(
    filters: QueryFilter<UserSettings>,
    update: UpdateQuery<UserSettings>,
    options?: QueryOptions<UserSettings>,
  ): Promise<UserSettingsDocument | null> {
    return await this.userSettingsModel.findOneAndUpdate(
      filters,
      update,
      options,
    );
  }
}
