import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bull';
import moment from 'moment';
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
        switch (job.jobId) {
          case this.queueService.getJobId({
            externalAccountId: job.externalAccountId,
            step: BullQueueStep.DAYS_3,
            queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
          }):
            await this.days3Backfill(job.externalAccountId, job.createdAt);
            break;
          case this.queueService.getJobId({
            externalAccountId: job.externalAccountId,
            step: BullQueueStep.DAYS_30,
            queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
          }):
            await this.days30Backfill(job.externalAccountId, job.createdAt);
            break;
          case this.queueService.getJobId({
            externalAccountId: job.externalAccountId,
            step: BullQueueStep.DAYS_90,
            queueName: BullQueueName.EMAIL_GOOGLE_BACKFILL,
          }):
            await this.days90Backfill(job.externalAccountId, job.createdAt);
            break;
        }
      } catch (error) {
        this.logger.error(`Error repairing job ${job.jobId}: ${error.message}`);
      }
    }
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
