import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { UserDTO } from 'src/user/dto/user.dto';

import { ExternalAccountDeleteDTO } from '../dto/external-account-delete.dto';
import { ExternalAccount } from '../schemas/external-account.schema';
import { ExternalAccountService } from '../services/external-account.service';

@Controller('external-account')
export class ExternalAccountController {
  constructor(
    private readonly externalAccountService: ExternalAccountService,
  ) {}

  @ApiResponse({
    type: [ExternalAccount],
  })
  @Get('list')
  list(@User() user: UserDTO) {
    return this.externalAccountService.list({ userId: user._id });
  }

  @Post('delete')
  delete(@User() user: UserDTO, @Body() payload: ExternalAccountDeleteDTO) {
    return this.externalAccountService.delete(payload, user);
  }
}
