import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Email } from '../schemas/email.schema';

@Injectable()
export class EmailService {
  constructor(
    @InjectModel(Email.name) private readonly emailModel: Model<Email>,
  ) {}

  async insertOne(email: Partial<Email>) {
    return this.emailModel.findOneAndUpdate(
      { emailId: email.emailId, externalAccountId: email.externalAccountId },
      { ...email },
      { upsert: true, new: true },
    );
  }
}
