import { Module } from '@nestjs/common';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { MicrosoftClientService } from './microsoft-client.service';

@Module({
  imports: [UserSettingsModule],
  providers: [MicrosoftClientService],
  exports: [MicrosoftClientService],
})
export class MicrosoftClientModule {}
