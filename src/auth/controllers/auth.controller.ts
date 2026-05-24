import { Controller, Get, Query } from '@nestjs/common';

import { AuthGoogleDTO } from '../dto/auth-google.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  google(@Query() payload: AuthGoogleDTO) {
    return this.authService.google(payload);
  }
}
