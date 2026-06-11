import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AuthMicrosoftConnectionCallbackDTO {
  @ApiPropertyOptional({
    type: 'string',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    type: 'string',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    type: 'string',
    required: false,
  })
  @IsString()
  @IsOptional()
  error?: string;
}
