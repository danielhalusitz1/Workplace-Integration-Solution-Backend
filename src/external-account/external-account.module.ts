import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

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
  ],
  providers: [ExternalAccountService],
  exports: [ExternalAccountService],
})
export class ExternalAccountModule {}
