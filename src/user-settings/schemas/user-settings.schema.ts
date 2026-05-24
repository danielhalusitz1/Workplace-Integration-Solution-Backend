import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'user-settings' })
export class UserSettings {
  _id: string;

  @Prop({ required: true })
  googleConnected: boolean;

  @Prop({ required: true })
  microsoftConnected: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
