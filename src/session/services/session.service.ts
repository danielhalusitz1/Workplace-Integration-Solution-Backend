import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ClientSession,
  Model,
  QueryFilter,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';

import { SessionCreateDTO } from '../dto/session-create.dto';
import { SessionGetActiveDTO } from '../dto/session-get-active.dto';
import { Session, SessionDocument } from '../schemas/session.schema';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private async removeExpiredSessions() {
    const now = new Date();

    await this.sessionModel.deleteMany({
      refreshExpiresAt: { $lte: now },
    });
  }

  async create(
    payload: SessionCreateDTO,
    session?: ClientSession,
  ): Promise<SessionDocument> {
    return (await this.sessionModel.create([payload], { session }))[0];
  }

  async getActiveSession(
    payload: SessionGetActiveDTO,
  ): Promise<SessionDocument | null> {
    const { accessToken, userId } = payload;

    const now = new Date();

    return await this.sessionModel.findOne({
      userId,
      accessToken,
      accessExpiresAt: { $gt: now },
    });
  }

  async findOneByFilters(
    filters: QueryFilter<Session>,
    options?: QueryOptions<Session>,
  ): Promise<SessionDocument | null> {
    return await this.sessionModel.findOne(filters, null, options);
  }

  async findOneAndUpdateByFilters(
    filters: QueryFilter<Session>,
    update: UpdateQuery<Session>,
    options?: QueryOptions<Session>,
  ): Promise<SessionDocument | null> {
    return await this.sessionModel.findOneAndUpdate(filters, update, options);
  }

  async deleteOneByFilters(
    filters: QueryFilter<Session>,
    session?: ClientSession,
  ) {
    return await this.sessionModel.deleteOne(filters, { session });
  }

  async deleteManyByFilters(
    filters: QueryFilter<Session>,
    session?: ClientSession,
  ) {
    return await this.sessionModel.deleteMany(filters, { session });
  }
}
