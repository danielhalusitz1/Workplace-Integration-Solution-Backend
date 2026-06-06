import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { SessionService } from 'src/session/services/session.service';
import { UserDTO } from 'src/user/dto/user.dto';

export interface RequestWithUser extends Request {
  user: UserDTO;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger: Logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    try {
      const request = context.switchToHttp().getRequest<RequestWithUser>();

      const accessToken = this.extractAccessTokenFromCookie(request);

      if (!accessToken) {
        throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
      }

      const user = await this.jwtService.verifyAsync<UserDTO>(accessToken);

      const activeSession = await this.sessionService.getActiveSession({
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
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
    }
  }

  private extractAccessTokenFromCookie(request: Request): string | null {
    return request.cookies['access-token'] ?? null;
  }
}
