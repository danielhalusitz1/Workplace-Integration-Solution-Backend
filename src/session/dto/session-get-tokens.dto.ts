import { UserDTO } from 'src/user/dto/user.dto';

export class SessionGetTokensDTO {
  user: UserDTO;
}

export class SessionGetTokensResponseDTO {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}
