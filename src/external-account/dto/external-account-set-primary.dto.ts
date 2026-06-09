import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ExternalAccountSetPrimaryDTO {
  @ApiProperty({
    type: 'string',
  })
  @IsString()
  _id: string;
}
