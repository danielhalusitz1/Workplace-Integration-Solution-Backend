import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { defaultSchemaOptions } from 'src/defaults/default-schema-options';

@Schema({ _id: false })
export class EmailAttachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  attachmentId: string;

  @Prop({ required: true })
  size: number;
}

@Schema({ ...defaultSchemaOptions, collection: 'email' })
export class Email {
  _id: Types.ObjectId;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  from: string;

  @Prop({ required: true })
  to: string[];

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  body: string;

  @Prop()
  historyId?: string;

  @Prop({ required: true })
  emailId: string;

  @Prop({ required: true })
  labelIds: string[];

  @Prop({ required: true })
  threadId: string;

  @Prop()
  emailSentAt?: Date;

  @Prop({ required: true, type: [EmailAttachment] })
  attachments: EmailAttachment[];

  createdAt: Date;

  updatedAt: Date;
}

export const EmailSchema = SchemaFactory.createForClass(Email);
export type EmailDocument = HydratedDocument<Email>;
