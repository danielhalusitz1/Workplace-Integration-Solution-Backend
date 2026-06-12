import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';
import moment from 'moment';
import { EmailQueueStep } from 'src/queue/enums/email-queue-step.enum';
import { QueueName } from 'src/queue/enums/queue-name.enum';

@Injectable()
export class EmailGoogleSyncService {
  constructor(
    @InjectQueue(QueueName.EMAIL_GOOGLE_BACKFILL)
    private readonly emailGoogleBackfillQueue: Queue,
  ) {}

  async startGoogleEmailBackfill(externalAccountId: string) {
    const maxDate = moment().toDate();
    const minDate = moment().subtract(90, 'days').toDate();

    await this.days3Backfill(
      externalAccountId,
      moment(maxDate).subtract(3, 'days').startOf('day').toDate(),
      moment(maxDate).endOf('day').toDate(),
    );

    await this.days30Backfill(
      externalAccountId,
      moment(maxDate).subtract(30, 'days').startOf('day').toDate(),
      moment(maxDate).subtract(4, 'days').endOf('day').toDate(),
    );

    await this.days90Backfill(
      externalAccountId,
      moment(minDate).startOf('day').toDate(),
      moment(maxDate).subtract(31, 'days').endOf('day').toDate(),
    );
  }

  async days3Backfill(externalAccountId: string, from: Date, to: Date) {
    await this.emailGoogleBackfillQueue.add(
      QueueName.EMAIL_GOOGLE_BACKFILL,
      {
        externalAccountId,
        step: EmailQueueStep.DAYS_3,
        from,
        to,
      },
      {
        priority: 10,
        attempts: 8,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async days30Backfill(externalAccountId: string, from: Date, to: Date) {
    await this.emailGoogleBackfillQueue.add(
      QueueName.EMAIL_GOOGLE_BACKFILL,
      {
        externalAccountId,
        step: EmailQueueStep.DAYS_30,
        from,
        to,
      },
      {
        priority: 50,
        attempts: 8,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async days90Backfill(externalAccountId: string, from: Date, to: Date) {
    await this.emailGoogleBackfillQueue.add(
      QueueName.EMAIL_GOOGLE_BACKFILL,
      {
        externalAccountId,
        step: EmailQueueStep.DAYS_90,
        from,
        to,
      },
      {
        priority: 100,
        attempts: 8,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
