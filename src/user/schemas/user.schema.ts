import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'user' })
export class User {
  _id: Types.ObjectId;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({
    required: true,
  })
  userSettingsId: string;

  @Prop({
    required: true,
  })
  primaryExternalAccount: string;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = HydratedDocument<User>;
