import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from 'src/session/schemas/session.schema';

import { defaultSessionCreate } from '../defaults/default-test-payloads';

@Injectable()
export class SessionTestProvider {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  async create(
    overrides: Parameters<typeof defaultSessionCreate>[0] = {},
  ): Promise<SessionDocument> {
    return (
      await this.sessionModel.create([defaultSessionCreate(overrides)])
    )[0];
  }

  async findByUserId(userId: string): Promise<SessionDocument[]> {
    return this.sessionModel.find({ userId });
  }
}
