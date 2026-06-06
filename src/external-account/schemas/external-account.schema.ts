import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'external-account' })
export class ExternalAccount {
  _id: Types.ObjectId;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, index: true, unique: true })
  foreignId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: ExternalAccountType, type: String })
  type: ExternalAccountType;

  @Prop({ required: true })
  refreshTokenEncrypted: string;

  @Prop({ required: true })
  accessTokenEncrypted: string;

  @Prop({ required: true })
  expiryDate: number;

  @Prop({ default: true })
  connected: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export const ExternalAccountSchema =
  SchemaFactory.createForClass(ExternalAccount);
export type ExternalAccountDocument = HydratedDocument<ExternalAccount>;

ExternalAccountSchema.index({ userId: 1, type: 1 }, { unique: true });
