import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { User } from 'src/decorators/user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserDTO } from 'src/user/dto/user.dto';

import { AuthGoogleDTO } from '../dto/auth-google.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  async google(@Query() payload: AuthGoogleDTO, @Res() res: Response) {
    return this.authService.google(payload, res);
  }

  @UseGuards(AuthGuard)
  @Get('refresh')
  async refresh(
    @User() user: UserDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.authService.refresh(user, req, res);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@User() user: UserDTO) {
    return user;
  }

  @UseGuards(AuthGuard)
  @Get('logout')
  async logout(
    @User() user: UserDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.authService.logout({ user, res, req });
  }

  @UseGuards(AuthGuard)
  @Get('logout-everywhere')
  async logoutEverywhere(@User() user: UserDTO, @Res() res: Response) {
    return this.authService.logoutEverywhere({ user, res });
  }
}
