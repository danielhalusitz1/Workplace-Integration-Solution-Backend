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
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';

import { ExternalAccountCreateDTO } from '../dto/external-account-create.dto';
import { ExternalAccountDeleteDTO } from '../dto/external-account-delete.dto';
import {
  ExternalAccount,
  ExternalAccountDocument,
} from '../schemas/external-account.schema';

@Injectable()
export class ExternalAccountService {
  constructor(
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,
    private readonly userSettingsService: UserSettingsService,
  ) {}

  async delete(payload: ExternalAccountDeleteDTO, user: UserDTO) {
    const userSettings = await this.userSettingsService.findOneByFilters({
      userId: user._id.toString(),
    });

    if (userSettings?.primaryExternalAccount === payload._id.toString()) {
      throw new BadRequestException(
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_DELETE_IS_PRIMARY,
      );
    }

    const result = await this.externalAccountModel.deleteOne({
      _id: payload._id,
      userId: user._id.toString(),
    });

    if (result.deletedCount === 0) {
      throw new BadRequestException(
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_DELETE_NOT_SUCCESS,
      );
    }
  }

  async create(
    payload: ExternalAccountCreateDTO,
    session?: ClientSession,
  ): Promise<ExternalAccountDocument> {
    return (await this.externalAccountModel.create([payload], { session }))[0];
  }

  async findOneByFilters(
    filters: QueryFilter<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ) {
    return this.externalAccountModel.findOne(filters, null, options);
  }

  async findByFilters(
    filters: QueryFilter<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ) {
    return this.externalAccountModel.find(filters, null, options);
  }

  findByFiltersCursor(
    filters: QueryFilter<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ) {
    return this.externalAccountModel
      .find(filters, null, options)
      .lean()
      .cursor();
  }

  async updateByFilters(
    filters: QueryFilter<ExternalAccount>,
    update: UpdateQuery<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ): Promise<ExternalAccountDocument | null> {
    return this.externalAccountModel.findOneAndUpdate(filters, update, options);
  }
}
