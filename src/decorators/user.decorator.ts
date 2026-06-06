import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { UserDTO } from 'src/user/dto/user.dto';

export interface RequestWithUser extends Request {
  user: UserDTO;
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new UnauthorizedException(ErrorTypes.RELOG_REQUIRED);
    }
    return request.user;
  },
);
