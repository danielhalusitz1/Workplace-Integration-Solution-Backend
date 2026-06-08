import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
  ],
  controllers: [ExternalAccountController],
  providers: [ExternalAccountService],
  exports: [ExternalAccountService],
})
export class ExternalAccountModule {}
