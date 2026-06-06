import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuthMicrosoftAuthCallbackDTO {
  @ApiPropertyOptional({
    type: 'string',
  })
  code?: string;

  @ApiPropertyOptional({
    type: 'string',
  })
  state?: string;
}
