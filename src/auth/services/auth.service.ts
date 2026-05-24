import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/auth/schemas/user.schema';

import { AuthGoogleCallbackDTO } from '../dto/auth-google-callback.dto';
import { AuthGoogleService } from './auth-google.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,

    private readonly authGoogleService: AuthGoogleService,
  ) {}

  async googleCallback(payload: AuthGoogleCallbackDTO) {
    await this.authGoogleService.login(payload);
  }
}
