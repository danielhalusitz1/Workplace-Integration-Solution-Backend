import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserDTO {
  @ApiProperty({
    type: 'string',
  })
  @Expose()
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
