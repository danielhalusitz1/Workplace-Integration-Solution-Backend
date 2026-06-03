import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'session' })
export class Session {
  _id: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ required: true })
  accessExpiresAt: Date;

  @Prop({ required: true })
  refreshExpiresAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
