import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from 'src/auth/services/auth.service';
import { UserDTO } from 'src/user/dto/user.dto';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const accessToken = this.extractTokenFromCookie(request);

    if (!accessToken) {
      throw new UnauthorizedException(
        'error.auth-guard.access-token-not-found',
      );
    }

    try {
      const user = await this.jwtService.verifyAsync<UserDTO>(accessToken, {
        secret: process.env.JWT_SECRET,
      });

      const activeSession = await this.authService.getActiveSession({
        accessToken,
        userId: user._id,
      });

      if (!activeSession) {
        throw new UnauthorizedException('error.auth-guard.session-not-exists');
      }

      return true;
    } catch {
      throw new UnauthorizedException('error.auth-guard.auth');
    }
  }

  private extractTokenFromCookie(request: Request): string | null {
    return request.cookies['access-token'] ?? null;
  }
}
