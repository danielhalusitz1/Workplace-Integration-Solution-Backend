import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { UserDTO } from 'src/user/dto/user.dto';

import { UserSubscription } from '../schemas/user-subscription.schema';
import { UserSubscriptionService } from '../services/user-subscription.service';

@Controller('user-subscription')
export class UserSubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  @ApiResponse({
    type: UserSubscription,
  })
  @Get()
  getByUserId(@User() user: UserDTO) {
    return this.userSubscriptionService.getByUserId({ userId: user._id });
  }
}
