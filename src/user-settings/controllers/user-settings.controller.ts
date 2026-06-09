import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { UserDTO } from 'src/user/dto/user.dto';

import { UserSettingsUpdateDTO } from '../dto/user-settings-update.dto';
import { UserSettings } from '../schemas/user-settings.schema';
import { UserSettingsService } from '../services/user-settings.service';

@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @ApiResponse({
    type: UserSettings,
  })
  @Post('update')
  async save(@User() user: UserDTO, @Body() payload: UserSettingsUpdateDTO) {
    return this.userSettingsService.update(payload, user);
  }

  @ApiResponse({
    type: UserSettings,
  })
  @Get()
  async getByUserId(@User() user: UserDTO) {
    return this.userSettingsService.getByUserId(user);
  }
}
