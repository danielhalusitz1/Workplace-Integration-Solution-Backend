import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, InsertManyOptions, Model } from 'mongoose';

import { Email } from '../schemas/email.schema';

@Injectable()
export class EmailService {
  constructor(
    @InjectModel(Email.name) private readonly emailModel: Model<Email>,
  ) {}

  async insertMany(emails: Partial<Email>[], options?: InsertManyOptions) {
    await this.emailModel.insertMany(emails, options ?? {});
  }

  async deleteMany({
    userId,
    externalAccountId,
    session,
  }: {
    userId: string;
    externalAccountId: string;
    session?: ClientSession;
  }) {
    await this.emailModel.deleteMany(
      {
        userId,
        externalAccountId,
      },
      { session },
    );
  }
}
