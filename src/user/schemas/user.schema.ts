import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'user' })
export class User {
  _id: string;

  @Prop()
  googleId?: string;

  @Prop()
  microsoftId?: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({
    required: true,
  })
  userSettingsId: string;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
