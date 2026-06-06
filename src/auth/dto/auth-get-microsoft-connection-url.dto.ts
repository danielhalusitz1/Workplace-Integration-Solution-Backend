import type { Response } from 'express';
import { UserDTO } from 'src/user/dto/user.dto';

export class AuthGetMicrosoftConnectionUrlDTO {
  user: UserDTO;
  res: Response;
}
