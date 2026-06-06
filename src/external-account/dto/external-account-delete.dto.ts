import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ExternalAccountDeleteDTO {
  @ApiProperty({
    type: 'string',
    description: 'The id of the external account to delete',
  })
  @IsString()
  _id: string;
}
