import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Model,
  QueryFilter,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';

import { ExternalAccountCreateDTO } from '../dto/external-account-create.dto';
import {
  ExternalAccount,
  ExternalAccountDocument,
} from '../schemas/external-account.schema';

@Injectable()
export class ExternalAccountService {
  constructor(
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,
  ) {}

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
