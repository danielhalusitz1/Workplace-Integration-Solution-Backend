import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { defaultSchemaOptions } from './default-schema-options';

@Schema({ ...defaultSchemaOptions, collection: 'user' })
export class User {}

export const UserSchema = SchemaFactory.createForClass(User);
