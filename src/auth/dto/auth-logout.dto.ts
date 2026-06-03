import type { Request, Response } from 'express';
import { UserDTO } from 'src/user/dto/user.dto';

export class AuthLogoutDTO {
  user: UserDTO;
  req: Request;
  res: Response;
}
