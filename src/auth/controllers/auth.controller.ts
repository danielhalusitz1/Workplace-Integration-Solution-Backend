import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { User } from 'src/decorators/user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserDTO } from 'src/user/dto/user.dto';

import { AuthGoogleDTO } from '../dto/auth-google.dto';
import { AuthMicrosoftDTO } from '../dto/auth-microsoft.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google-auth-url')
  getGoogleAuthUrl(@Res({ passthrough: true }) res: Response) {
    return this.authService.getGoogleAuthUrl({ res });
  }

  @Get('microsoft-auth-url')
  getMicrosoftAuthUrl(@Res({ passthrough: true }) res: Response) {
    return this.authService.getMicrosoftAuthUrl({ res });
  }

  @Get('google')
  async google(
    @Query() payload: AuthGoogleDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.google(payload, req, res);
  }

  @Get('microsoft')
  async microsoft(
    @Query() payload: AuthMicrosoftDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.microsoft(payload, req, res);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.refresh(req, res);
  }

  @ApiResponse({
    type: UserDTO,
  })
  @UseGuards(AuthGuard)
  @Get('me')
  me(@User() user: UserDTO): UserDTO {
    return user;
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(
    @User() user: UserDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logout({ user, res, req });
  }

  @UseGuards(AuthGuard)
  @Post('logout-everywhere')
  async logoutEverywhere(
    @User() user: UserDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logoutEverywhere({ user, res });
  }
}
