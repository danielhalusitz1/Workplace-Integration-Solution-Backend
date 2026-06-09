import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';
import { ExternalAccountType } from 'src/external-account/enums/external-account-type.enum';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'external-account' })
export class ExternalAccount {
  @ApiProperty({
    type: 'string',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    type: 'string',
  })
  @Prop({ required: true })
  userId: string;

  @ApiProperty({
    type: 'string',
  })
  @Prop({ required: true, index: true, unique: true })
  foreignId: string;

  @ApiProperty({
    type: 'string',
  })
  @Prop({ required: true })
  email: string;

  @ApiProperty({
    enum: ExternalAccountType,
  })
  @Prop({ required: true, enum: ExternalAccountType, type: String })
  type: ExternalAccountType;

  @ApiProperty({
    type: 'string',
  })
  @Prop({ required: true })
  refreshTokenEncrypted: string;

  @ApiProperty({
    type: 'string',
  })
  @Prop({ required: true })
  accessTokenEncrypted: string;

  @ApiProperty({
    type: 'number',
  })
  @Prop({ required: true })
  expiryDate: number;

  @ApiProperty({
    type: 'boolean',
  })
  @Prop({ default: true })
  connected: boolean;

  @ApiProperty({
    type: 'boolean',
  })
  @Prop({ default: false })
  banned: boolean;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}

export const ExternalAccountSchema =
  SchemaFactory.createForClass(ExternalAccount);
export type ExternalAccountDocument = HydratedDocument<ExternalAccount>;
