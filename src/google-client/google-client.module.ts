import { Module } from '@nestjs/common';
import { ExternalAccountModule } from 'src/external-account/external-account.module';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { GoogleClientService } from './services/google-client.service';

@Module({
  imports: [ExternalAccountModule, UserSettingsModule],
  providers: [GoogleClientService],
  exports: [GoogleClientService],
})
export class GoogleClientModule {}
