import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuthMicrosoftConnectionCallbackDTO {
  @ApiPropertyOptional({
    type: 'string',
  })
  code?: string;

  @ApiPropertyOptional({
    type: 'string',
  })
  state?: string;
}
