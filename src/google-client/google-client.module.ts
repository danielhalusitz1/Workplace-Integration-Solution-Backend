import { Module } from '@nestjs/common';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { GoogleClientService } from './google-client.service';

@Module({
  imports: [UserSettingsModule],
  providers: [GoogleClientService],
  exports: [GoogleClientService],
})
export class GoogleClientModule {}
