import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import type { Request } from 'express';
import { AuthService } from 'src/auth/services/auth.service';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { UserDTO } from 'src/user/dto/user.dto';

export interface RequestWithUser extends Request {
  user: UserDTO;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const accessToken = this.extractAccessTokenFromCookie(request);

    if (!accessToken) {
      throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
    }

    const user = await this.jwtService.verifyAsync<UserDTO>(accessToken);

    const activeSession = await this.authService.getActiveSession({
      accessToken,
      userId: user._id,
    });

    if (!activeSession) {
      throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
    }

    request.user = plainToInstance(UserDTO, user, {
      excludeExtraneousValues: true,
    });

    return true;
  }

  private extractAccessTokenFromCookie(request: Request): string | null {
    return request.cookies['access-token'] ?? null;
  }
}
