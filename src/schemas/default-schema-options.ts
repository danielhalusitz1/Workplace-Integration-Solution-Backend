import { SchemaOptions } from '@nestjs/mongoose';

export const defaultSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
};
