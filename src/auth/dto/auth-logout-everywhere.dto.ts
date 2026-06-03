import type { Response } from 'express';
import { UserDTO } from 'src/user/dto/user.dto';

export class AuthLogoutEveryWhereDTO {
  user: UserDTO;
  res: Response;
}
