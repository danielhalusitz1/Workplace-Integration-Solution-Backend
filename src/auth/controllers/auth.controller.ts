import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from 'src/decorators/public.decorator';
import { User } from 'src/decorators/user.decorator';
import { UserDTO } from 'src/user/dto/user.dto';

import { AuthGoogleAuthCallbackDTO } from '../dto/auth-google-auth-callback.dto';
import { AuthGoogleConnectionCallbackDTO } from '../dto/auth-google-connection-callback.dto';
import { AuthMicrosoftAuthCallbackDTO } from '../dto/auth-microsoft-auth-callback.dto';
import { AuthMicrosoftConnectionCallbackDTO } from '../dto/auth-microsoft-connection-callback.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiResponse({
    type: String,
  })
  @Get('google-connection-url')
  getGoogleConnectionUrl(
    @User() user: UserDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.getGoogleConnectionUrl({ user, res });
  }

  @ApiResponse({
    type: String,
  })
  @Get('microsoft-connection-url')
  getMicrosoftConnectionUrl(
    @User() user: UserDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.getMicrosoftConnectionUrl({ user, res });
  }

  @ApiResponse({
    type: String,
  })
  @Public()
  @Get('google-auth-url')
  getGoogleAuthUrl(@Res({ passthrough: true }) res: Response) {
    return this.authService.getGoogleAuthUrl({ res });
  }

  @ApiResponse({
    type: String,
  })
  @Public()
  @Get('microsoft-auth-url')
  getMicrosoftAuthUrl(@Res({ passthrough: true }) res: Response) {
    return this.authService.getMicrosoftAuthUrl({ res });
  }

  @Public()
  @Get('google-auth-callback')
  googleAuthCallback(
    @Query() payload: AuthGoogleAuthCallbackDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.googleAuthCallback(payload, req, res);
  }

  @Public()
  @Get('google-connection-callback')
  googleConnectionCallback(
    @Query() payload: AuthGoogleConnectionCallbackDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.googleConnectionCallback(payload, req, res);
  }

  @Public()
  @Get('microsoft-auth-callback')
  microsoftAuthCallback(
    @Query() payload: AuthMicrosoftAuthCallbackDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.microsoftAuthCallback(payload, req, res);
  }

  @Public()
  @Get('microsoft-connection-callback')
  microsoftConnectionCallback(
    @Query() payload: AuthMicrosoftConnectionCallbackDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.microsoftConnectionCallback(payload, req, res);
  }

  @Public()
  @Post('refresh')
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.refresh(req, res);
  }

  @ApiResponse({
    type: UserDTO,
  })
  @Get('me')
  me(@User() user: UserDTO): UserDTO {
    return user;
  }

  @Post('logout')
  logout(
    @User() user: UserDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logout({ user, res, req });
  }

  @Post('logout-everywhere')
  logoutEverywhere(
    @User() user: UserDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logoutEverywhere({ user, res });
  }
}
