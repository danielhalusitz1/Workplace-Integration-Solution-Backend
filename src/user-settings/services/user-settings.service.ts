import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, QueryFilter, QueryOptions } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { UserDTO } from 'src/user/dto/user.dto';

import { UserSettingsCreateDTO } from '../dto/user-settings-create.dto';
import { UserSettingsUpdateDTO } from '../dto/user-settings-update.dto';
import { UserSettingsUpdatePrimaryExternalAccountDTO } from '../dto/user-settings-update-primary-external-account.dto';
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
      throw new NotFoundException(
        ErrorTypes.USER_SETTINGS_SERVICE_GET_BY_USER_ID_NOT_FOUND,
      );
    }

    return userSettings;
  }

  async update(
    payload: UserSettingsUpdateDTO,
    user: UserDTO,
  ): Promise<UserSettingsDocument> {
    const { theme, language, firstName, lastName } = payload;
    const userSettings = await this.userSettingsModel.findOneAndUpdate(
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
        ErrorTypes.USER_SETTINGS_SERVICE_UPDATE_NOT_SUCCESS,
      );
    }

    return userSettings;
  }

  async updatePrimaryExternalAccount(
    payload: UserSettingsUpdatePrimaryExternalAccountDTO,
  ): Promise<UserSettingsDocument> {
    const { primaryExternalAccount, userId } = payload;
    const userSettings = await this.userSettingsModel.findOneAndUpdate(
      {
        userId,
      },
      {
        primaryExternalAccount,
      },
      {
        returnDocument: 'after',
      },
    );

    if (!userSettings) {
      throw new NotFoundException(
        ErrorTypes.USER_SETTINGS_SERVICE_UPDATE_PRIMARY_EXTERNAL_ACCOUNT_SETTING_NOT_FOUND,
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
}
