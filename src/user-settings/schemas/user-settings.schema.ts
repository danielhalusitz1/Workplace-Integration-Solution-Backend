import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';
import { Language } from 'src/user-settings/enums/language.enum';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';
import { Theme } from '../enums/theme.enum';

@Schema({ ...defaultSchemaOptions, collection: 'user-settings' })
export class UserSettings {
  @ApiProperty({
    type: 'string',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    type: 'string',
  })
  @Prop({ required: true, unique: true })
  userId: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
  })
  @Prop()
  firstName?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
  })
  @Prop()
  lastName?: string;

  @ApiProperty({
    type: 'string',
  })
  @Prop({
    required: true,
  })
  primaryExternalAccount: string;

  @ApiProperty({
    enum: Language,
  })
  @Prop({ default: Language.EN, enum: Language, type: String })
  language: Language;

  @ApiProperty({
    enum: Theme,
  })
  @Prop({ default: Theme.DARK, enum: Theme, type: String })
  theme: Theme;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
export type UserSettingsDocument = HydratedDocument<UserSettings>;
