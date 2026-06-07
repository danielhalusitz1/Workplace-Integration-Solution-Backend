import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserDTO } from 'src/user/dto/user.dto';

import { UserSettingsSaveDTO } from '../dto/user-settings-save.dto';
import { UserSettings } from '../schemas/user-settings.schema';
import { UserSettingsService } from '../services/user-settings.service';

@UseGuards(AuthGuard)
@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @ApiResponse({
    type: UserSettings,
  })
  @Post('save')
  async save(@User() user: UserDTO, @Body() payload: UserSettingsSaveDTO) {
    return this.userSettingsService.save(payload, user);
  }

  @ApiResponse({
    type: UserSettings,
  })
  @Get()
  async getByUserId(@User() user: UserDTO) {
    return this.userSettingsService.getByUserId(user);
  }
}
