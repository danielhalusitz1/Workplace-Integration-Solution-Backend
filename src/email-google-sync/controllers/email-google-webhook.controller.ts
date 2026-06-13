import { Body, Controller, Post } from '@nestjs/common';
import { Public } from 'src/decorators/public.decorator';

import { EmailGoogleSyncService } from '../services/email-google-sync.service';

@Controller('gmail/webhook')
export class EmailGoogleWebhookController {
  constructor(private emailGoogleSyncService: EmailGoogleSyncService) {}

  @Public()
  @Post()
  async handleWebhook(@Body() payload: any) {
    await this.emailGoogleSyncService.handleWebhook(payload);

    return { ok: true };
  }
}
