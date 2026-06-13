import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Queue } from 'bull';
import { ClientSession, Model, QueryFilter, Types } from 'mongoose';

import { BullQueueJobStatus } from '../enums/bull-queue-job-status.enum';
import { BullQueueName } from '../enums/bull-queue-name.enum';
import { BullQueueStep } from '../enums/bull-queue-step.enum';
import { BullQueue } from '../schema/bull-queue.schema';

@Injectable()
export class QueueService {
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
  }: {
    externalAccountId: string;
    step: BullQueueStep;
    queueName: BullQueueName;
  }) {
    return await this.bullQueueModel.create({
      externalAccountId,
      step,
      queueName,
      status: BullQueueJobStatus.PENDING,
      jobId: this.getJobId({ externalAccountId, step, queueName }),
    });
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
        $unset: { leaseUntil: 1, lastAttemptAt: 1, nextPage: 1 },
      },
      { returnDocument: 'after' },
    );
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
    return await this.bullQueueModel.findOneAndUpdate(
      { externalAccountId, step, queueName },
      {
        status: BullQueueJobStatus.FAILED,
        $unset: { leaseUntil: 1, lastAttemptAt: 1, nextPage: 1 },
      },
      { returnDocument: 'after' },
    );
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
