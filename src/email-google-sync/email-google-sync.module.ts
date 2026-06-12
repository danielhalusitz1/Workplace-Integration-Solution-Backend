import { Module } from '@nestjs/common';
import { QueueModule } from 'src/queue/queue.module';

import { EmailGoogleSyncService } from './services/email-google-sync.service';

@Module({
  imports: [QueueModule],
  providers: [EmailGoogleSyncService],
  exports: [EmailGoogleSyncService],
})
export class EmailGoogleSyncModule {}
