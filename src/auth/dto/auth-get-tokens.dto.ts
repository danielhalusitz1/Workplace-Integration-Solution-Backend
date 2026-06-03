import { UserDTO } from 'src/user/dto/user.dto';

export class GetTokensDTO {
  user: UserDTO;
}

export class GetTokensResponseDTO {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}
