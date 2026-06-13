import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { Types } from 'mongoose';
import { EmailService } from 'src/email/services/email.service';
import { ExternalAccountStatus } from 'src/external-account/enums/external-account.status';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { GoogleClientService } from 'src/google-client/services/google-client.service';
import { BullQueueName } from 'src/queue/enums/bull-queue-name.enum';
import { BullQueueStep } from 'src/queue/enums/bull-queue-step.enum';
import { QueueService } from 'src/queue/services/queue.service';
import { buildGmailDateQuery } from 'src/utils/gmail-search-query';
import { parseGmailEmail } from 'src/utils/google-email-parse';

@Processor(BullQueueName.EMAIL_GOOGLE_BACKFILL)
export class EmailGoogleSyncBackfillProcessor {
  private readonly logger = new Logger(EmailGoogleSyncBackfillProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly externalAccountService: ExternalAccountService,
    private readonly googleClientService: GoogleClientService,
  ) {}
  @Process(BullQueueName.EMAIL_GOOGLE_BACKFILL)
  async handle(
    job: Job<{
      externalAccountId: string;
      step: BullQueueStep;
      from: string;
      to: string;
    }>,
  ) {
    const { from, to, externalAccountId, step } = job.data;

    const emailQueue = await this.queueService.startOrRestartJob({
      externalAccountId,
      step,
      queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
    });

    if (!emailQueue) {
      return;
    }

    const externalAccount = await this.externalAccountService.findOneByFilters({
      _id: new Types.ObjectId(externalAccountId),
      status: ExternalAccountStatus.CONNECTED,
    });

    if (!externalAccount) {
      await this.queueService.failJob({
        externalAccountId,
        step,
        queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
      });
      return;
    }

    let pageToken = emailQueue.nextPage;

    do {
      const nextPageToken = await this.googleClientService.run(
        externalAccount,
        async ({ gmailApi }) => {
          const pageRes = await gmailApi.users.messages.list({
            userId: 'me',
            q: buildGmailDateQuery(from, to),
            maxResults: 100,
            pageToken,
          });

          const messages = pageRes.data.messages ?? [];

          for (const message of messages) {
            if (!message.id) {
              continue;
            }

            const messageDetails = await gmailApi.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full',
            });

            try {
              const parsedEmail = parseGmailEmail(
                messageDetails.data,
                externalAccount.userId,
                externalAccountId,
              );
              await this.emailService.insertOne(parsedEmail);
            } catch (error) {
              this.logger.error(
                `Error parsing email ${message.id}: ${error.message}`,
              );
            }
          }

          return pageRes.data.nextPageToken ?? undefined;
        },
      );

      await this.queueService.updateJob({
        _id: emailQueue._id.toString(),
        nextPage: nextPageToken,
      });

      pageToken = nextPageToken ?? undefined;
    } while (pageToken);

    await this.queueService.completeJob({
      _id: emailQueue._id.toString(),
    });
  }
}
