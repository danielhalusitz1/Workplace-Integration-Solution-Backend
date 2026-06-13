import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { defaultSchemaOptions } from 'src/defaults/default-schema-options';

import { BullQueueJobStatus } from '../enums/bull-queue-job-status.enum';
import { BullQueueName } from '../enums/bull-queue-name.enum';
import { BullQueueStep } from '../enums/bull-queue-step.enum';

@Schema({ ...defaultSchemaOptions, collection: 'bull-queue' })
export class BullQueue {
  _id: Types.ObjectId;

  @Prop({ required: true })
  externalAccountId: string;

  @Prop({ required: true })
  step: BullQueueStep;

  @Prop({ required: true })
  queueName: BullQueueName;

  @Prop({ required: true })
  jobId: string;

  @Prop()
  nextPage?: string;

  @Prop({ default: BullQueueJobStatus.PENDING })
  status: BullQueueJobStatus;

  @Prop({ default: null, type: Date, nullable: true })
  leaseUntil: Date | null;

  @Prop({ default: Date.now })
  lastAttemptAt?: Date;

  @Prop({ default: 0 })
  repairAttempts: number;

  createdAt: Date;

  updatedAt: Date;
}

export const BullQueueSchema = SchemaFactory.createForClass(BullQueue);
