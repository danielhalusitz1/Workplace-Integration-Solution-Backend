import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ExternalAccount,
  ExternalAccountSchema,
} from 'src/auth/schemas/external-account.schema';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { MicrosoftClientService } from './microsoft-client.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExternalAccount.name, schema: ExternalAccountSchema },
    ]),
    UserSettingsModule,
  ],
  providers: [MicrosoftClientService],
  exports: [MicrosoftClientService],
})
export class MicrosoftClientModule {}
