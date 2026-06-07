import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { Theme } from '../enums/theme.enum';

export class UserSettingsSetThemeDTO {
  @ApiProperty({
    enum: Theme,
  })
  @IsEnum(Theme)
  theme: Theme;
}
