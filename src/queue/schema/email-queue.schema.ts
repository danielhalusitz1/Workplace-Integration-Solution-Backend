import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { defaultSchemaOptions } from 'src/defaults/default-schema-options';

import { EmailQueueStep } from '../enums/email-queue-step.enum';
import { JobStatus } from '../enums/job-status.enum';

@Schema({ ...defaultSchemaOptions, collection: 'email-queue' })
export class EmailQueue {
  _id: Types.ObjectId;

  @Prop({ required: true })
  externalAccountId: string;

  @Prop({ required: true })
  step: EmailQueueStep;

  @Prop({ required: true })
  jobId: string;

  @Prop()
  nextPage?: string;

  @Prop({ required: true })
  status: JobStatus;

  createdAt: Date;

  updatedAt: Date;
}

const EmailQueueSchema = SchemaFactory.createForClass(EmailQueue);
export default EmailQueueSchema;
