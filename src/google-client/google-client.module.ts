import { Module } from '@nestjs/common';

import { GoogleClientService } from './google-client.service';

@Module({
  providers: [GoogleClientService],
  exports: [GoogleClientService],
})
export class GoogleClientModule {}
