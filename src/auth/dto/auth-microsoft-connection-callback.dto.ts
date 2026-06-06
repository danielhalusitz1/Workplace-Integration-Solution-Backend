import { ApiProperty } from '@nestjs/swagger';

export class AuthMicrosoftConnectionCallbackDTO {
  @ApiProperty({
    type: 'string',
  })
  code: string;

  @ApiProperty({
    type: 'string',
  })
  state: string;
}
