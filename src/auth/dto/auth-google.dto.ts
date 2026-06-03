import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AuthGoogleDTO {
  @ApiProperty({
    type: 'string',
  })
  @IsString()
  code: string;
}
