import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

import { User } from '../schemas/user.schema';

export class UserDTO {
  @ApiProperty({
    type: 'string',
  })
  @Expose()
  @Transform(({ obj }: { obj: User }) => obj._id.toString())
  _id: string;

  @ApiProperty({
    type: 'string',
  })
  @Expose()
  email: string;

  @ApiProperty({
    type: 'string',
  })
  @Expose()
  firstName?: string;

  @ApiProperty({
    type: 'string',
  })
  @Expose()
  lastName?: string;
}
