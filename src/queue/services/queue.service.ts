import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Queue } from 'bull';
import { ClientSession, Model } from 'mongoose';

import { EmailQueueStep } from '../enums/email-queue-step.enum';
import { JobStatus } from '../enums/job-status.enum';
import { QueueName } from '../enums/queue-name.enum';
import { EmailQueue } from '../schema/email-queue.schema';

@Injectable()
export class QueueService {
  constructor(
    @InjectModel(EmailQueue.name)
    private readonly emailQueueModel: Model<EmailQueue>,

    @InjectQueue(QueueName.EMAIL_GOOGLE_BACKFILL)
    private readonly emailGoogleBackfillQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private async removeEmailQueueByStatus() {
    await this.emailQueueModel.deleteMany({
      $or: [
        { status: JobStatus.COMPLETED },
        { status: JobStatus.CANCELLED },
        { createdAt: { $lt: new Date(Date.now() - 10 * 60 * 60 * 1000) } },
      ],
    });
  }

  async createEmailQueue({
    externalAccountId,
    step,
    nextPage,
    status,
    jobId,
  }: {
    externalAccountId: string;
    step: EmailQueueStep;
    nextPage?: string;
    status: JobStatus;
    jobId: string;
  }) {
    return await this.emailQueueModel.create({
      externalAccountId,
      step,
      nextPage,
      status,
      jobId,
    });
  }

  async updateEmailQueue({
    externalAccountId,
    step,
    nextPage,
    status,
    jobId,
  }: {
    externalAccountId: string;
    step: EmailQueueStep;
    nextPage?: string;
    status: JobStatus;
    jobId: string;
  }) {
    return await this.emailQueueModel.findOneAndUpdate(
      { externalAccountId, step, jobId },
      { nextPage, status },
      { returnDocument: 'after' },
    );
  }

  async findOneEmailQueue({
    externalAccountId,
    step,
    status,
  }: {
    externalAccountId: string;
    step: EmailQueueStep;
    status: JobStatus;
  }) {
    return await this.emailQueueModel.findOne({
      externalAccountId,
      step,
      status,
    });
  }

  async deleteEmailQueueByExternalAccountId(
    externalAccountId: string,
    session?: ClientSession,
  ) {
    const emailQueues = await this.emailQueueModel.find(
      {
        externalAccountId,
      },
      { session },
    );

    await Promise.all(
      emailQueues.map(async (emailQueue) => {
        await this.emailGoogleBackfillQueue.removeJobs(emailQueue.jobId);
        await this.emailQueueModel.deleteOne(
          { _id: emailQueue._id },
          { session },
        );
      }),
    );
  }
}
