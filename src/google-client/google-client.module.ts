import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ExternalAccount,
  ExternalAccountSchema,
} from 'src/auth/schemas/external-account.schema';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { GoogleClientService } from './google-client.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExternalAccount.name, schema: ExternalAccountSchema },
    ]),
    UserSettingsModule,
  ],
  providers: [GoogleClientService],
  exports: [GoogleClientService],
})
export class GoogleClientModule {}
