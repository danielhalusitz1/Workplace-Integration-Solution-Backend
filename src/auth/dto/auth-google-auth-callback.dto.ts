import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuthGoogleAuthCallbackDTO {
  @ApiPropertyOptional({
    type: 'string',
  })
  code?: string;

  @ApiPropertyOptional({
    type: 'string',
  })
  state?: string;
}
