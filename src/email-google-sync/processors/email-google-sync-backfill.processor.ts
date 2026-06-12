import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Types } from 'mongoose';
import { EmailService } from 'src/email/services/email.service';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { GoogleClientService } from 'src/google-client/services/google-client.service';
import { EmailQueueStep } from 'src/queue/enums/email-queue-step.enum';
import { JobStatus } from 'src/queue/enums/job-status.enum';
import { QueueName } from 'src/queue/enums/queue-name.enum';
import { QueueService } from 'src/queue/services/queue.service';
import { parseGmailEmail } from 'src/utils/google-email-parse';

@Processor(QueueName.EMAIL_GOOGLE_BACKFILL)
export class EmailGoogleSyncBackfillProcessor {
  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly externalAccountService: ExternalAccountService,
    private readonly googleClientService: GoogleClientService,
  ) {}
  @Process()
  async handle(
    job: Job<{
      externalAccountId: string;
      step: EmailQueueStep;
      from: Date;
      to: Date;
    }>,
  ) {
    const { from, to, externalAccountId, step } = job.data;

    const jobId = job.id.toString();

    let emailQueue = await this.queueService.findOneEmailQueue({
      externalAccountId,
      step,
      status: JobStatus.STARTED,
    });

    if (!emailQueue) {
      emailQueue = await this.queueService.createEmailQueue({
        externalAccountId,
        jobId,
        step,
        status: JobStatus.STARTED,
      });
    }

    const externalAccount = await this.externalAccountService.findOneByFilters({
      _id: new Types.ObjectId(externalAccountId),
    });

    if (!externalAccount) {
      throw new Error(
        'External account not found for id: ' + externalAccountId,
      );
    }

    let pageToken = emailQueue.nextPage;

    do {
      const page = await this.googleClientService.run(
        externalAccount,
        async ({ gmailApi }) => {
          const pageRes = await gmailApi.users.messages.list({
            userId: 'me',
            q: `after:${from.toISOString()} before:${to.toISOString()}`,
            maxResults: 100,
            pageToken,
          });
          return pageRes.data;
        },
      );

      const parsedMessages =
        page.messages?.map((message) =>
          parseGmailEmail(message, externalAccountId),
        ) ?? [];

      pageToken = page.nextPageToken ?? undefined;

      await this.emailService.insertMany(parsedMessages, { ordered: false });
    } while (pageToken);

    await this.queueService.updateEmailQueue({
      externalAccountId,
      jobId,
      step,
      status: JobStatus.COMPLETED,
    });
  }
}
