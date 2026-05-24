import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, QueryOptions, UpdateQuery } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

import { UserSettingsCreateDTO } from '../dto/user-settings-create.dto';
import { UserSettings } from '../schemas/user-settings.schema';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectModel(UserSettings.name)
    private readonly userSettingsModel: Model<UserSettings>,
  ) {}

  async create(payload: UserSettingsCreateDTO, session?: ClientSession) {
    return (await this.userSettingsModel.create([payload], { session }))[0];
  }

  async updateByFilters(
    filters: UpdateQuery<User>,
    update: UpdateQuery<User>,
    options?: QueryOptions<User>,
  ) {
    return await this.userSettingsModel.findOneAndUpdate(
      filters,
      update,
      options,
    );
  }
}
