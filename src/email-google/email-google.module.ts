import { Module } from '@nestjs/common';
import { ExternalAccountModule } from 'src/external-account/external-account.module';
import { GoogleClientModule } from 'src/google-client/google-client.module';
import { QueueModule } from 'src/queue/queue.module';

import { EmailGoogleController } from './controllers/email-google.controller';
import { EmailGoogleService } from './services/email-google.service';

@Module({
  imports: [GoogleClientModule, ExternalAccountModule, QueueModule],
  controllers: [EmailGoogleController],
  providers: [EmailGoogleService],
})
export class EmailGoogleModule {}
