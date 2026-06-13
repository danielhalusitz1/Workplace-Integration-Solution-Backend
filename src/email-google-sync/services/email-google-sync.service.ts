import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bull';
import moment from 'moment';
import { ClientSession, Types } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { ExternalAccountStatus } from 'src/external-account/enums/external-account.status';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { GoogleClientService } from 'src/google-client/services/google-client.service';
import { BullQueueJobStatus } from 'src/queue/enums/bull-queue-job-status.enum';
import { BullQueueName } from 'src/queue/enums/bull-queue-name.enum';
import { BullQueueStep } from 'src/queue/enums/bull-queue-step.enum';
import { QueueService } from 'src/queue/services/queue.service';

@Injectable()
export class EmailGoogleSyncService {
  private readonly logger = new Logger(EmailGoogleSyncService.name);
  constructor(
    @InjectQueue(BullQueueName.EMAIL_GOOGLE_BACKFILL)
    private readonly emailGoogleBackfillQueue: Queue,

    private readonly queueService: QueueService,
    private readonly externalAccountService: ExternalAccountService,
    private readonly googleClientService: GoogleClientService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/5 * * * * ')
  private async repairJobs() {
    const cursor = this.queueService.findByFiltersCursor({
      queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
      $or: [
        { status: BullQueueJobStatus.PENDING },
        {
          status: BullQueueJobStatus.STARTED,
          leaseUntil: { $lt: Date.now() },
        },
      ],
    });

    for await (const job of cursor) {
      try {
        const repairAttempts = await this.queueService.incrementRepairAttempt({
          _id: job._id.toString(),
        });

        if (repairAttempts > this.queueService.getMaxRepairAttempts()) {
          await this.queueService.failJob({
            externalAccountId: job.externalAccountId,
            step: job.step,
            queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
          });
          this.logger.warn(
            `Job ${job.jobId} marked FAILED after ${repairAttempts} repair attempts`,
          );
          continue;
        }

        const now = new Date();
        switch (job.jobId) {
          case this.queueService.getJobId({
            externalAccountId: job.externalAccountId,
            step: BullQueueStep.DAYS_3,
            queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
          }):
            await this.days3Backfill(job.externalAccountId, now);
            break;
          case this.queueService.getJobId({
            externalAccountId: job.externalAccountId,
            step: BullQueueStep.DAYS_30,
            queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
          }):
            await this.days30Backfill(job.externalAccountId, now);
            break;
          case this.queueService.getJobId({
            externalAccountId: job.externalAccountId,
            step: BullQueueStep.DAYS_90,
            queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
          }):
            await this.days90Backfill(job.externalAccountId, now);
            break;
        }
      } catch (error) {
        this.logger.error(`Error repairing job ${job.jobId}: ${error.message}`);
      }
    }
  }

  async handleWebhook(payload: any) {
    console.log(payload);
  }

  async startWatch({
    externalAccountId,
    session,
  }: {
    externalAccountId: string;
    session?: ClientSession;
  }) {
    const externalAccount = await this.externalAccountService.findOneByFilters(
      {
        _id: new Types.ObjectId(externalAccountId),
        status: ExternalAccountStatus.CONNECTED,
      },
      { session },
    );

    if (!externalAccount) {
      throw new NotFoundException(
        ErrorTypes.EMAIL_GOOGLE_SYNC_SERVICE_START_WATCHING_JOBS_EXTERNAL_ACCOUNT_NOT_FOUND,
      );
    }

    await this.googleClientService.run(
      externalAccount,
      async ({ gmailApi }) => {
        const projectId =
          this.configService.getOrThrow<string>('GOOGLE_PROJECT_ID');
        const watchTopic = this.configService.getOrThrow<string>(
          'GOOGLE_GMAIL_WATCH_TOPIC',
        );

        const watchResponse = await gmailApi.users.watch({
          userId: 'me',
          requestBody: {
            topicName: `projects/${projectId}/topics/${watchTopic}`,
          },
        });

        if (!watchResponse.data.expiration || !watchResponse.data.historyId) {
          throw new BadRequestException(
            ErrorTypes.EMAIL_GOOGLE_SYNC_SERVICE_START_WATCHING_JOBS_WATCH_RESPONSE_MISSING_DATA,
          );
        }

        await this.externalAccountService.updateWatch({
          externalAccountId,
          watchExpirationDate: new Date(Number(watchResponse.data.expiration)),
          watchId: watchResponse.data.historyId,
          session,
        });
      },
    );
  }

  async startGoogleEmailBackfill(externalAccountId: string) {
    const now = new Date();
    await this.days3Backfill(externalAccountId, now);

    await this.days30Backfill(externalAccountId, now);

    await this.days90Backfill(externalAccountId, now);
  }

  async days3Backfill(externalAccountId: string, date: Date) {
    await this.emailGoogleBackfillQueue.add(
      BullQueueName.EMAIL_GOOGLE_BACKFILL,
      {
        externalAccountId,
        step: BullQueueStep.DAYS_3,
        from: moment(date).subtract(3, 'days').startOf('day').toDate(),
        to: moment(date).endOf('day').toDate(),
      },
      {
        jobId: this.queueService.getJobId({
          externalAccountId,
          step: BullQueueStep.DAYS_3,
          queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
        }),
        priority: 10,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async days30Backfill(externalAccountId: string, date: Date) {
    await this.emailGoogleBackfillQueue.add(
      BullQueueName.EMAIL_GOOGLE_BACKFILL,
      {
        externalAccountId,
        step: BullQueueStep.DAYS_30,
        from: moment(date).subtract(30, 'days').startOf('day').toDate(),
        to: moment(date).subtract(4, 'days').endOf('day').toDate(),
      },
      {
        jobId: this.queueService.getJobId({
          externalAccountId,
          step: BullQueueStep.DAYS_30,
          queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
        }),
        priority: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async days90Backfill(externalAccountId: string, date: Date) {
    await this.emailGoogleBackfillQueue.add(
      BullQueueName.EMAIL_GOOGLE_BACKFILL,
      {
        externalAccountId,
        step: BullQueueStep.DAYS_90,
        from: moment(date).subtract(90, 'days').startOf('day').toDate(),
        to: moment(date).subtract(31, 'days').endOf('day').toDate(),
      },
      {
        jobId: this.queueService.getJobId({
          externalAccountId,
          step: BullQueueStep.DAYS_90,
          queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
        }),
        priority: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
