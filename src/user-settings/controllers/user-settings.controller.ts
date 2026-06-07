import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserDTO } from 'src/user/dto/user.dto';

import { UserSettingsSetLanguageDTO } from '../dto/user-settings-set-language.dto';
import { UserSettingsSetThemeDTO } from '../dto/user-settings-set-theme.dto';
import { UserSettings } from '../schemas/user-settings.schema';
import { UserSettingsService } from '../services/user-settings.service';

@UseGuards(AuthGuard)
@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @ApiResponse({
    type: UserSettings,
  })
  @Post('set-theme')
  async setTheme(
    @User() user: UserDTO,
    @Body() payload: UserSettingsSetThemeDTO,
  ) {
    return this.userSettingsService.setTheme(payload, user);
  }

  @ApiResponse({
    type: UserSettings,
  })
  @Post('set-language')
  async setLanguage(
    @User() user: UserDTO,
    @Body() payload: UserSettingsSetLanguageDTO,
  ) {
    return this.userSettingsService.setLanguage(payload, user);
  }
}
