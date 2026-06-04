import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, QueryFilter, QueryOptions } from 'mongoose';

import { UserCreateDTO } from '../dto/user-create.dto';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(
    payload: UserCreateDTO,
    session?: ClientSession,
  ): Promise<UserDocument> {
    return (await this.userModel.create([payload], { session }))[0];
  }

  async findOneByFilters(
    filters: QueryFilter<User>,
    options?: QueryOptions<User>,
  ): Promise<UserDocument | null> {
    return await this.userModel.findOne(filters, null, options);
  }
}
