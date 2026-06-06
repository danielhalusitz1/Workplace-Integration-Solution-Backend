import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ExternalAccount,
  ExternalAccountDocument,
} from 'src/auth/schemas/external-account.schema';

import { defaultExternalAccountCreate } from '../defaults/default-test-payloads';

@Injectable()
export class ExternalAccountTestProvider {
  constructor(
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,
  ) {}

  async create(
    overrides: Parameters<typeof defaultExternalAccountCreate>[0] = {},
  ): Promise<ExternalAccountDocument> {
    return (
      await this.externalAccountModel.create([
        defaultExternalAccountCreate(overrides),
      ])
    )[0];
  }

  async findByUserId(userId: string): Promise<ExternalAccountDocument[]> {
    return this.externalAccountModel.find({ userId });
  }

  async findByForeignId(
    foreignId: string,
  ): Promise<ExternalAccountDocument | null> {
    return this.externalAccountModel.findOne({ foreignId });
  }
}
