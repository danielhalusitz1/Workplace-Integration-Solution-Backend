import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';
import { ExternalAccountType } from '../enum/external-account-type.enum';

@Schema({ ...defaultSchemaOptions, collection: 'external-account' })
export class ExternalAccount {
  _id: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  foreignId: string;

  @Prop({ required: true, enum: ExternalAccountType })
  type: ExternalAccountType;

  @Prop({ required: true })
  refreshTokenEncrypted: string;

  createdAt: Date;

  updatedAt: Date;
}

export const ExternalAccountSchema =
  SchemaFactory.createForClass(ExternalAccount);
