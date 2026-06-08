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
import { UserSettingsSaveDTO } from '../dto/user-settings-save.dto';
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

  async getByUserId(user: UserDTO): Promise<UserSettingsDocument> {
    const userSettings = await this.findOneByFilters({ userId: user._id });

    if (!userSettings) {
      throw new BadRequestException(
        ErrorTypes.USER_SETTINGS_SERVICE_GET_BY_USER_ID_NOT_FOUND,
      );
    }

    return userSettings;
  }

  async save(
    payload: UserSettingsSaveDTO,
    user: UserDTO,
  ): Promise<UserSettingsDocument> {
    const { theme, language, firstName, lastName } = payload;
    const userSettings = await this.updateByFilters(
      { userId: user._id },
      {
        theme,
        language,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      },
      { returnDocument: 'after' },
    );

    if (!userSettings) {
      throw new BadRequestException(
        ErrorTypes.USER_SETTINGS_SERVICE_SAVE_NOT_SUCCESS,
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
