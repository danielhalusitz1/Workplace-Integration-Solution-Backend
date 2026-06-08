import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from 'src/user-subscription/schemas/user-subscription.schema';

import { defaultUserSubscriptionCreate } from '../defaults/default-test-payloads';

@Injectable()
export class UserSubscriptionTestProvider {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscription>,
  ) {}

  async create(
    overrides: Parameters<typeof defaultUserSubscriptionCreate>[0] = {},
  ): Promise<UserSubscriptionDocument> {
    return (
      await this.userSubscriptionModel.create([
        defaultUserSubscriptionCreate(overrides),
      ])
    )[0];
  }

  async findByUserId(
    userId: string,
  ): Promise<UserSubscriptionDocument | null> {
    return this.userSubscriptionModel.findOne({ userId });
  }
}
