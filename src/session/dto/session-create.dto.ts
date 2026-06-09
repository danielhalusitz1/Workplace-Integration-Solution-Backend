import { ClientSession } from 'mongoose';
import { UserDTO } from 'src/user/dto/user.dto';

export class SessionCreateDTO {
  user: UserDTO;
  session?: ClientSession;
}
