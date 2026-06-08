import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSubscriptionController } from './controllers/user-subscription.controller';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from './schemas/user-subscription.schema';
import { UserSubscriptionService } from './services/user-subscription.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
  ],
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService],
  exports: [UserSubscriptionService],
})
export class UserSubscriptionModule {}
