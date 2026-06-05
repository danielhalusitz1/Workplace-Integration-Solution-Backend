import { Module } from '@nestjs/common';

import { MicrosoftClientService } from './microsoft-client.service';

@Module({
  providers: [MicrosoftClientService],
  exports: [MicrosoftClientService],
})
export class MicrosoftClientModule {}
