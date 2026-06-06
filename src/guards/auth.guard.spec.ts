import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { ErrorTypes } from 'src/enums/error-types.enum';
import {
  createMockRequest,
  SessionTestProvider,
  setupMongoTestLifecycle,
  UserTestProvider,
} from 'src/test';
import { UserDTO } from 'src/user/dto/user.dto';

import { AuthGuard } from './auth.guard';

function createMockExecutionContext(
  request: ReturnType<typeof createMockRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as ExecutionContext;
}

const JWT_TEST_SECRET = 'test-jwt-secret';

describe('AuthGuard', () => {
  const ctx = setupMongoTestLifecycle({
    imports: [JwtModule.register({ secret: JWT_TEST_SECRET })],
    providers: [AuthGuard],
  });

  let authGuard: AuthGuard;
  let jwtService: JwtService;
  let sessionTestProvider: SessionTestProvider;
  let userTestProvider: UserTestProvider;

  beforeEach(() => {
    authGuard = ctx.module.get(AuthGuard);
    jwtService = ctx.module.get(JwtService);
    sessionTestProvider = ctx.module.get(SessionTestProvider);
    userTestProvider = ctx.module.get(UserTestProvider);
  });

  describe('canActivate', () => {
    it('allows access when the JWT and active session are valid', async () => {
      const user = await userTestProvider.create();
      const userDTO = plainToInstance(UserDTO, user, {
        excludeExtraneousValues: true,
      });
      const accessToken = await jwtService.signAsync({ ...userDTO });
      const request = createMockRequest({ 'access-token': accessToken });

      await sessionTestProvider.create({
        userId: user._id.toString(),
        accessToken,
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const result = await authGuard.canActivate(
        createMockExecutionContext(request),
      );

      expect(result).toBe(true);
      expect(request.user).toEqual(userDTO);
    });

    it('rejects access when the access-token cookie is missing', async () => {
      await expect(
        authGuard.canActivate(createMockExecutionContext(createMockRequest())),
      ).rejects.toThrow(new UnauthorizedException(ErrorTypes.RELOG_REQUIRED));
    });

    it('rejects access when there is no active session for the token', async () => {
      const user = await userTestProvider.create();
      const userDTO = plainToInstance(UserDTO, user, {
        excludeExtraneousValues: true,
      });
      const accessToken = await jwtService.signAsync({ ...userDTO });

      await expect(
        authGuard.canActivate(
          createMockExecutionContext(
            createMockRequest({ 'access-token': accessToken }),
          ),
        ),
      ).rejects.toThrow(new UnauthorizedException(ErrorTypes.RELOG_REQUIRED));
    });

    it('rejects access when the session access token has expired', async () => {
      const user = await userTestProvider.create();
      const userDTO = plainToInstance(UserDTO, user, {
        excludeExtraneousValues: true,
      });
      const accessToken = await jwtService.signAsync({ ...userDTO });

      await sessionTestProvider.create({
        userId: user._id.toString(),
        accessToken,
        accessExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        authGuard.canActivate(
          createMockExecutionContext(
            createMockRequest({ 'access-token': accessToken }),
          ),
        ),
      ).rejects.toThrow(new UnauthorizedException(ErrorTypes.RELOG_REQUIRED));
    });
  });
});
