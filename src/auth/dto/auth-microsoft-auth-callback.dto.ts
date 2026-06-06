import { ApiProperty } from '@nestjs/swagger';

export class AuthMicrosoftAuthCallbackDTO {
  @ApiProperty({
    type: 'string',
  })
  code: string;

  @ApiProperty({
    type: 'string',
  })
  state: string;
}
