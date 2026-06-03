import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'user-settings' })
export class UserSettings {
  _id: string;

  @Prop({ default: false })
  googleConnected: boolean;

  @Prop({ default: false })
  microsoftConnected: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
