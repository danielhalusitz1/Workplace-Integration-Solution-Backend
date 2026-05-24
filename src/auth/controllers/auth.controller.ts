import { Controller, Get, Query } from '@nestjs/common';

import { AuthGoogleCallbackDTO } from '../dto/auth-google-callback.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google-callback')
  googleCallback(@Query() payload: AuthGoogleCallbackDTO) {
    return this.authService.googleCallback(payload);
  }
}
