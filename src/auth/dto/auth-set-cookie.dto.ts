import type { Response } from 'express';

export class AuthSetCookie {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
  redirect: boolean;
  res: Response;
}
