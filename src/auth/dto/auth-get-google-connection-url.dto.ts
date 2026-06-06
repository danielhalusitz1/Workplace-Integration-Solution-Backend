import type { Response } from 'express';
import { UserDTO } from 'src/user/dto/user.dto';

export class AuthGetGoogleConnectionUrlDTO {
  user: UserDTO;
  res: Response;
}
