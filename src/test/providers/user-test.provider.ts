import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserCreateDTO } from 'src/user/dto/user-create.dto';
import { User, UserDocument } from 'src/user/schemas/user.schema';

import { defaultUserCreate } from '../defaults/default-test-payloads';

@Injectable()
export class UserTestProvider {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(overrides: Partial<UserCreateDTO> = {}): Promise<UserDocument> {
    return (await this.userModel.create([defaultUserCreate(overrides)]))[0];
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }
}
