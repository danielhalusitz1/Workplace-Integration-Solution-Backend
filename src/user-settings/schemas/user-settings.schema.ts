import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Language } from 'src/auth/enum/language.enum';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'user-settings' })
export class UserSettings {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({
    required: true,
  })
  primaryExternalAccount: string;

  @Prop({ default: Language.EN, enum: Language, type: String })
  language: Language;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
export type UserSettingsDocument = HydratedDocument<UserSettings>;
