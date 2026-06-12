import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { EmailService } from 'src/email/services/email.service';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { GoogleClientService } from 'src/google-client/services/google-client.service';
import { QueueName } from 'src/queue/enums/queue-name.enum';
import { parseGmailEmail } from 'src/utils/google-email-parse';

@Processor(QueueName.EMAIL_GOOGLE_SYNC_PAGE)
export class SyncPageProcessor {
  constructor(
    private readonly emailService: EmailService,
    private googleClientService: GoogleClientService,
    private externalAccountService: ExternalAccountService,
  ) {}

  @Process({ concurrency: 5 })
  async handle(
    job: Job<{ userId: string; from: Date; to: Date; pageToken: string }>,
  ) {
    const { userId, from, to, pageToken } = job.data;

    const account = await this.externalAccountService.findOneByFilters({
      userId,
    });

    if (!account) {
      throw new Error('Google account not found for user: ' + userId);
    }

    const page = await this.googleClientService.run(
      account,
      async ({ gmailApi }) => {
        const pageRes = await gmailApi.users.messages.list({
          userId,
          q: `after:${from.toISOString()} before:${to.toISOString()}`,
          maxResults: 100,
          pageToken,
        });

        return pageRes.data;
      },
    );

    if (!page) {
      throw new Error('Failed to get page for user: ' + userId);
    }

    const emails = page.messages?.map((m) => parseGmailEmail(m, userId)) ?? [];

    await this.emailService.insertMany(emails, { ordered: false });

    if (page.nextPageToken) {
      await job.queue.add(QueueName.EMAIL_GOOGLE_SYNC_PAGE, {
        userId,
        from,
        to,
        pageToken: page.nextPageToken,
      });
    }
  }
}
