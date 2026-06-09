import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';

import { UserSubscriptionCreateFreeDTO } from '../dto/user-subscription-create-free.dto';
import { UserSubscriptionGetByUserIdDTO } from '../dto/user-subscription-get-by-user-id.dto';
import { UserSubscriptionType } from '../enums/user-subscription-type.enum';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from '../schemas/user-subscription.schema';

@Injectable()
export class UserSubscriptionService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscription>,
  ) {}

  async getByUserId(
    payload: UserSubscriptionGetByUserIdDTO,
  ): Promise<UserSubscriptionDocument> {
    const { userId, session } = payload;
    const userSubscription = await this.userSubscriptionModel.findOne(
      {
        userId,
      },
      null,
      { session },
    );
    if (!userSubscription) {
      throw new NotFoundException(
        ErrorTypes.USER_SUBSCRIPTION_SERVICE_GET_BY_USER_ID_NOT_FOUND,
      );
    }
    return userSubscription;
  }

  async createFree(
    payload: UserSubscriptionCreateFreeDTO,
  ): Promise<UserSubscriptionDocument> {
    const { userId, session } = payload;

    return (
      await this.userSubscriptionModel.create(
        [
          {
            userId,
            subscriptionType: UserSubscriptionType.FREE,
            startDate: new Date(),
          },
        ],
        { session },
      )
    )[0];
  }
}
