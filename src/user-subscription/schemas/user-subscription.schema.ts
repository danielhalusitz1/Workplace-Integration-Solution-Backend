import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { defaultSchemaOptions } from '../../defaults/default-schema-options';
import { UserSubscriptionType } from '../enums/user-subscription-type.enum';

@Schema({ ...defaultSchemaOptions, collection: 'user-subscription' })
export class UserSubscription {
  @ApiProperty({
    type: 'string',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    type: 'string',
  })
  @Prop({ required: true })
  userId: string;

  /*   @Prop({ required: true })
  organizationId: string; */

  @ApiProperty({
    enum: UserSubscriptionType,
  })
  @Prop({ required: true, enum: UserSubscriptionType, type: String })
  subscriptionType: UserSubscriptionType;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
  })
  @Prop({ required: true })
  startDate: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @Prop()
  endDate?: Date;

  @ApiProperty({
    type: 'number',
  })
  @Prop({ default: 0 })
  organizationLimit: number;

  @ApiProperty({
    type: 'number',
  })
  @Prop({ default: 0 })
  organizationMemberLimit: number;

  @ApiProperty({
    type: 'number',
  })
  @Prop({ default: 1 })
  externalAccountPerTypeLimit: number;

  @ApiProperty({
    type: 'number',
  })
  @Prop({ default: 10 })
  aIAssistantQuestionsLimit: number;

  @ApiProperty({
    type: 'boolean',
  })
  @Prop({ default: true })
  isActive: boolean;

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

export type UserSubscriptionDocument = HydratedDocument<UserSubscription>;
export const UserSubscriptionSchema =
  SchemaFactory.createForClass(UserSubscription);
