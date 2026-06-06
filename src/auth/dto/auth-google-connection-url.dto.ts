import type { Response } from 'express';
import { UserDTO } from 'src/user/dto/user.dto';

export class AuthGoogleConnectionUrlDTO {
  user: UserDTO;
  res: Response;
}
