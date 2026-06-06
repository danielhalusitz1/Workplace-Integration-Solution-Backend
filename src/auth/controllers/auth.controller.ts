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
  @UseGuards(AuthGuard)
  @Get('google-connection-url')
  getGoogleConnectionUrl(@User() user: UserDTO) {
    return this.authService.getGoogleConnectionUrl({ user });
  }

  @ApiResponse({
    type: String,
  })
  @UseGuards(AuthGuard)
  @Get('microsoft-connection-url')
  getMicrosoftConnectionUrl(@User() user: UserDTO) {
    return this.authService.getMicrosoftConnectionUrl({ user });
  }

  @ApiResponse({
    type: String,
  })
  @Get('google-auth-url')
  getGoogleAuthUrl(@Res({ passthrough: true }) res: Response) {
    return this.authService.getGoogleAuthUrl({ res });
  }

  @ApiResponse({
    type: String,
  })
  @Get('microsoft-auth-url')
  getMicrosoftAuthUrl(@Res({ passthrough: true }) res: Response) {
    return this.authService.getMicrosoftAuthUrl({ res });
  }

  @Get('google-auth-callback')
  googleAuthCallback(
    @Query() payload: AuthGoogleAuthCallbackDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.googleAuthCallback(payload, req, res);
  }

  @Get('google-connection-callback')
  googleConnectionCallback(
    @Query() payload: AuthGoogleConnectionCallbackDTO,
  ): Promise<void> {
    return this.authService.googleConnectionCallback(payload);
  }

  @Get('microsoft-auth-callback')
  microsoftAuthCallback(
    @Query() payload: AuthMicrosoftAuthCallbackDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.microsoftAuthCallback(payload, req, res);
  }

  @Get('microsoft-connection-callback')
  microsoftConnectionCallback(
    @Query() payload: AuthMicrosoftConnectionCallbackDTO,
  ): Promise<void> {
    return this.authService.microsoftConnectionCallback(payload);
  }

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
  @UseGuards(AuthGuard)
  @Get('me')
  me(@User() user: UserDTO): UserDTO {
    return user;
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout(
    @User() user: UserDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logout({ user, res, req });
  }

  @UseGuards(AuthGuard)
  @Post('logout-everywhere')
  logoutEverywhere(
    @User() user: UserDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logoutEverywhere({ user, res });
  }
}
