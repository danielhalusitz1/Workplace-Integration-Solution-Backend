import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuthGoogleConnectionCallbackDTO {
  @ApiPropertyOptional({
    type: 'string',
  })
  code?: string;

  @ApiPropertyOptional({
    type: 'string',
  })
  state?: string;
}
