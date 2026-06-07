import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { Language } from '../enums/language.enum';

export class UserSettingsSetLanguageDTO {
  @ApiProperty({
    enum: Language,
  })
  @IsEnum(Language)
  language: Language;
}
