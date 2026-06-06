import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Model,
  QueryFilter,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';

import { UserSettingsCreateDTO } from '../dto/user-settings-create.dto';
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

  async findOneByFilters(
    filters: QueryFilter<UserSettings>,
    options?: QueryOptions<UserSettings>,
  ): Promise<UserSettingsDocument | null> {
    return await this.userSettingsModel.findOne(filters, null, options);
  }

  async updateByFilters(
    filters: UpdateQuery<UserSettings>,
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
