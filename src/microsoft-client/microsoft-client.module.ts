import { Module } from '@nestjs/common';
import { ExternalAccountModule } from 'src/external-account/external-account.module';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { MicrosoftClientService } from './services/microsoft-client.service';

@Module({
  imports: [ExternalAccountModule, UserSettingsModule],
  providers: [MicrosoftClientService],
  exports: [MicrosoftClientService],
})
export class MicrosoftClientModule {}
