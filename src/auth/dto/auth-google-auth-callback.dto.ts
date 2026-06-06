import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AuthGoogleAuthCallbackDTO {
  @ApiProperty({
    type: 'string',
  })
  @IsString()
  code: string;

  @ApiProperty({
    type: 'string',
  })
  @IsString()
  state: string;
}
