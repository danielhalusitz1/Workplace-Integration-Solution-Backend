import { UserDTO } from 'src/user/dto/user.dto';

export class SessionUpdateDTO {
  user: UserDTO;
  oldRefreshToken: string;
}
