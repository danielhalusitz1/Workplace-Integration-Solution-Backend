import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Queue } from 'bull';
import { ClientSession, Model, QueryFilter, Types } from 'mongoose';

import { BullQueueJobStatus } from '../enums/bull-queue-job-status.enum';
import { BullQueueName } from '../enums/bull-queue-name.enum';
import { BullQueueStep } from '../enums/bull-queue-step.enum';
import { BullQueue } from '../schema/bull-queue.schema';

const MAX_REPAIR_ATTEMPTS = 12;

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectModel(BullQueue.name)
    private readonly bullQueueModel: Model<BullQueue>,

    @InjectQueue(BullQueueName.EMAIL_GOOGLE_BACKFILL)
    private readonly emailGoogleBackfillQueue: Queue,
    @InjectQueue(BullQueueName.EMAIL_MICROSOFT_BACKFILL)
    private readonly emailMicrosoftBackfillQueue: Queue,
  ) {}

  getJobId({
    externalAccountId,
    step,
    queueName,
  }: {
    externalAccountId: string;
    step: BullQueueStep;
    queueName: BullQueueName;
  }) {
    return `${externalAccountId}-${step}-${queueName}`;
  }

  parseJobId(jobId: string) {
    const [externalAccountId, step, queueName] = jobId.split('-');
    return { externalAccountId, step, queueName };
  }

  async appointJob({
    externalAccountId,
    step,
    queueName,
    session,
  }: {
    externalAccountId: string;
    step: BullQueueStep;
    queueName: BullQueueName;
    session?: ClientSession;
  }) {
    const existingJob = await this.bullQueueModel.findOne(
      {
        externalAccountId,
        step,
        queueName,
        status: {
          $in: [BullQueueJobStatus.PENDING, BullQueueJobStatus.STARTED],
        },
      },
      null,
      { session },
    );

    if (existingJob) {
      this.logger.warn(
        `Job already exists for external account ${externalAccountId} and step ${step} and queue name ${queueName}`,
      );
      return;
    }
    return (
      await this.bullQueueModel.create(
        [
          {
            externalAccountId,
            step,
            queueName,
            status: BullQueueJobStatus.PENDING,
            jobId: this.getJobId({ externalAccountId, step, queueName }),
          },
        ],
        { session },
      )
    )[0];
  }

  async startOrRestartJob({
    externalAccountId,
    step,
    queueName,
  }: {
    externalAccountId: string;
    step: BullQueueStep;
    queueName: BullQueueName;
  }) {
    const now = new Date();
    return await this.bullQueueModel.findOneAndUpdate(
      {
        externalAccountId,
        queueName,
        step,
        $or: [
          { status: BullQueueJobStatus.PENDING },
          {
            status: BullQueueJobStatus.STARTED,
            leaseUntil: { $lt: Date.now() },
          },
        ],
      },
      {
        leaseUntil: new Date(+now + 10 * 60 * 1000),
        lastAttemptAt: now,
        status: BullQueueJobStatus.STARTED,
      },
      { returnDocument: 'after' },
    );
  }

  async completeJob({ _id }: { _id: string }) {
    return await this.bullQueueModel.findOneAndUpdate(
      { _id: new Types.ObjectId(_id) },
      {
        status: BullQueueJobStatus.COMPLETED,
        $unset: {
          leaseUntil: 1,
          lastAttemptAt: 1,
          nextPage: 1,
          repairAttempts: 1,
        },
      },
      { returnDocument: 'after' },
    );
  }

  async incrementRepairAttempt({ _id }: { _id: string }) {
    const updated = await this.bullQueueModel.findOneAndUpdate(
      { _id: new Types.ObjectId(_id) },
      { $inc: { repairAttempts: 1 } },
      { returnDocument: 'after' },
    );

    return updated?.repairAttempts ?? 0;
  }

  getMaxRepairAttempts() {
    return MAX_REPAIR_ATTEMPTS;
  }

  async failJob({
    externalAccountId,
    step,
    queueName,
  }: {
    externalAccountId: string;
    step: BullQueueStep;
    queueName: BullQueueName;
  }) {
    const jobId = this.getJobId({ externalAccountId, step, queueName });

    const failed = await this.bullQueueModel.findOneAndUpdate(
      { externalAccountId, step, queueName },
      {
        status: BullQueueJobStatus.FAILED,
        $unset: {
          leaseUntil: 1,
          lastAttemptAt: 1,
          nextPage: 1,
          repairAttempts: 1,
        },
      },
      { returnDocument: 'after' },
    );

    switch (queueName) {
      case BullQueueName.EMAIL_GOOGLE_BACKFILL:
        await this.emailGoogleBackfillQueue.removeJobs(jobId);
        break;
      case BullQueueName.EMAIL_MICROSOFT_BACKFILL:
        await this.emailMicrosoftBackfillQueue.removeJobs(jobId);
        break;
    }

    return failed;
  }

  async updateJob({ _id, nextPage }: { _id: string; nextPage?: string }) {
    const now = new Date();
    return await this.bullQueueModel.findOneAndUpdate(
      { _id: new Types.ObjectId(_id) },
      {
        leaseUntil: new Date(+now + 10 * 60 * 1000),
        lastAttemptAt: now,
        nextPage,
      },
      { returnDocument: 'after' },
    );
  }

  async findOneByFilters(filters: QueryFilter<BullQueue>) {
    return await this.bullQueueModel.findOne(filters);
  }

  findByFiltersCursor(filters: QueryFilter<BullQueue>) {
    return this.bullQueueModel.find(filters).lean().cursor();
  }

  async deleteJobByExternalAccountId(
    externalAccountId: string,
    session?: ClientSession,
  ) {
    await this.bullQueueModel.updateMany(
      { externalAccountId },
      { status: BullQueueJobStatus.CANCELLED },
      { session },
    );

    await this.emailGoogleBackfillQueue.removeJobs(`${externalAccountId}-*`);
    await this.emailMicrosoftBackfillQueue.removeJobs(`${externalAccountId}-*`);
  }
}
