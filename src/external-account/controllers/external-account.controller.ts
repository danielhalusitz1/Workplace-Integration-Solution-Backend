import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { User } from 'src/decorators/user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserDTO } from 'src/user/dto/user.dto';

import { ExternalAccountDeleteDTO } from '../dto/external-account-delete.dto';
import { ExternalAccountService } from '../services/external-account.service';

@UseGuards(AuthGuard)
@Controller('external-account')
export class ExternalAccountController {
  constructor(
    private readonly externalAccountService: ExternalAccountService,
  ) {}

  @Post('delete')
  delete(@User() user: UserDTO, @Body() payload: ExternalAccountDeleteDTO) {
    return this.externalAccountService.delete(payload, user);
  }
}
