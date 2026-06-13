import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';

import { ExternalAccountStatus } from '../enums/external-account.status';
import { ExternalAccountType } from '../enums/external-account-type.enum';
import { ExternalAccount } from '../schemas/external-account.schema';

export class ExternalAccountDTO extends OmitType(ExternalAccount, [
  'refreshTokenEncrypted',
  'accessTokenEncrypted',
  'expiryDate',
]) {
  @ApiProperty({
    type: 'string',
  })
  @Expose()
  @Transform(({ obj }: { obj: ExternalAccount }) => obj._id.toString())
  _id: Types.ObjectId;

  @ApiProperty({
    enum: ExternalAccountStatus,
  })
  @Expose()
  status: ExternalAccountStatus;

  @ApiProperty({
    type: 'string',
  })
  @Expose()
  email: string;

  @ApiProperty({
    type: 'string',
  })
  @Expose()
  foreignId: string;

  @ApiProperty({
    enum: ExternalAccountType,
  })
  @Expose()
  type: ExternalAccountType;

  @ApiProperty({
    type: 'string',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  createdAt: Date;
}
