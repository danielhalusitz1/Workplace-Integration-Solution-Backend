import { ApiProperty } from '@nestjs/swagger';

export class AuthGoogleConnectionCallbackDTO {
  @ApiProperty({
    type: 'string',
  })
  code: string;

  @ApiProperty({
    type: 'string',
  })
  state: string;
}
