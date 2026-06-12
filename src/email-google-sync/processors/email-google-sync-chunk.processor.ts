import { InjectQueue, Process, Processor } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { GoogleClientService } from 'src/google-client/services/google-client.service';
import { QueueName } from 'src/queue/enums/queue-name.enum';

@Processor(QueueName.EMAIL_GOOGLE_SYNC_CHUNK)
export class EmailGoogleSyncChunkProcessor {
  constructor(
    @InjectQueue(QueueName.EMAIL_GOOGLE_SYNC_PAGE)
    private pageQueue: Queue,

    private googleClientService: GoogleClientService,
    private externalAccountService: ExternalAccountService,
  ) {}

  @Process({ concurrency: 3 })
  async handle(job: Job<{ userId: string; from: Date; to: Date }>) {
    const { userId, from, to } = job.data;

    const googleAccount = await this.externalAccountService.findOneByFilters({
      userId,
    });

    if (!googleAccount) {
      throw new Error('Google account not found for user: ' + userId);
    }

    const page = await this.googleClientService.run(
      googleAccount,
      async ({ gmailApi }) => {
        const pageRes = await gmailApi.users.messages.list({
          userId: 'me',
          q: `after:${from.toISOString()} before:${to.toISOString()}`,
          maxResults: 100,
        });
        return pageRes.data;
      },
    );

    if (!page) {
      throw new Error('Failed to get page for user: ' + userId);
    }

    await this.pageQueue.add(QueueName.EMAIL_GOOGLE_SYNC_PAGE, {
      userId,
      from,
      to,
      pageToken: page.nextPageToken || null,
    });
  }
}
