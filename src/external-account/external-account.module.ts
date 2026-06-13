import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from 'src/email/email.module';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { QueueModule } from 'src/queue/queue.module';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';
import { UserSubscriptionModule } from 'src/user-subscription/user-subscription.module';

import { ExternalAccountController } from './controllers/external-account.controller';
import {
  ExternalAccount,
  ExternalAccountSchema,
} from './schemas/external-account.schema';
import { ExternalAccountService } from './services/external-account.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExternalAccount.name, schema: ExternalAccountSchema },
    ]),
    UserSettingsModule,
    UserSubscriptionModule,
    QueueModule,
  ],
  controllers: [ExternalAccountController],
  providers: [ExternalAccountService, MongodbTransactionService],
  exports: [ExternalAccountService],
})
export class ExternalAccountModule {}
