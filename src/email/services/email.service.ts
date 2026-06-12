import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';

import { Email, EmailDocument } from '../schemas/email.schema';

@Injectable()
export class EmailService {
  constructor(
    @InjectModel(Email.name) private readonly emailModel: Model<Email>,
  ) {}

  async createMany(
    emails: Partial<Email>[],
    session?: ClientSession,
  ): Promise<EmailDocument[]> {
    return await this.emailModel.insertMany(emails, { session });
  }
}
