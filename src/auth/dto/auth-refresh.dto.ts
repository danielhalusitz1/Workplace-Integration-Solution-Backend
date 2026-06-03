import { UserDTO } from 'src/user/dto/user.dto';

export class AuthRefreshDTO {
  user: UserDTO;
  req: Request;
  res: Response;
}
