import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { ExternalAccountModule } from 'src/external-account/external-account.module';
import { GoogleClientModule } from 'src/google-client/google-client.module';
import { QueueModule } from 'src/queue/queue.module';

import { EmailGoogleWebhookController } from './controllers/email-google-webhook.controller';
import { EmailGoogleSyncBackfillProcessor } from './processors/email-google-sync-backfill.processor';
import { EmailGoogleSyncService } from './services/email-google-sync.service';

@Module({
  imports: [
    QueueModule,
    GoogleClientModule,
    ExternalAccountModule,
    EmailModule,
  ],
  controllers: [EmailGoogleWebhookController],
  providers: [EmailGoogleSyncService, EmailGoogleSyncBackfillProcessor],
  exports: [EmailGoogleSyncService],
})
export class EmailGoogleSyncModule {}
