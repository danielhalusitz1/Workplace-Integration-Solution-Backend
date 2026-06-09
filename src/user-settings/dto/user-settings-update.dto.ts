import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { Language } from '../enums/language.enum';
import { Theme } from '../enums/theme.enum';

export class UserSettingsUpdateDTO {
  @ApiProperty({
    enum: Theme,
  })
  @IsEnum(Theme)
  theme: Theme;

  @ApiProperty({
    enum: Language,
  })
  @IsEnum(Language)
  language: Language;

  @ApiProperty({
    type: 'string',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}
