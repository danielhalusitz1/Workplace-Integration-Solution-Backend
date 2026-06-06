import type { Response } from 'express';
import { UserDTO } from 'src/user/dto/user.dto';

export class AuthMicrosoftGetConnectionUrlDTO {
  user: UserDTO;
  res: Response;
}
