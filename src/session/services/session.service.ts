import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientSession, Model, QueryFilter, QueryOptions } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';

import { SessionCreateDTO } from '../dto/session-create.dto';
import { SessionDeleteDTO } from '../dto/session-delete.dto';
import { SessionDeleteManyDTO } from '../dto/session-delete-many.dto';
import { SessionGetActiveDTO } from '../dto/session-get-active.dto';
import {
  SessionGetTokensDTO,
  SessionGetTokensResponseDTO,
} from '../dto/session-get-tokens.dto';
import { SessionUpdateDTO } from '../dto/session-update.dto';
import { Session, SessionDocument } from '../schemas/session.schema';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    private readonly jwtService: JwtService,
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

  private async getTokens(
    payload: SessionGetTokensDTO,
  ): Promise<SessionGetTokensResponseDTO> {
    const { user } = payload;

    const now = Date.now();

    const plainUser = {
      ...user,
    };

    const accessToken = await this.jwtService.signAsync(plainUser, {
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(plainUser, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      accessExpiresAt: new Date(now + 24 * 60 * 60 * 1000),
      refreshToken,
      refreshExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async update(payload: SessionUpdateDTO) {
    const { user, oldRefreshToken } = payload;

    const { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt } =
      await this.getTokens({ user });

    const now = new Date();
    const session = await this.sessionModel.findOneAndUpdate(
      {
        userId: user._id.toString(),
        refreshToken: oldRefreshToken,
        refreshExpiresAt: { $gte: now },
      },
      {
        accessToken,
        accessExpiresAt,
        refreshToken,
        refreshExpiresAt,
      },
      {
        returnDocument: 'after',
      },
    );

    if (!session) {
      throw new BadRequestException(
        ErrorTypes.SESSION_SERVICE_UPDATE_NOT_SUCCESS,
      );
    }

    return session;
  }

  async deleteOne(payload: SessionDeleteDTO) {
    const { userId, refreshToken, session } = payload;
    return await this.sessionModel.deleteOne(
      { userId, refreshToken },
      { session },
    );
  }

  async deleteMany(payload: SessionDeleteManyDTO) {
    const { userId, session } = payload;
    return await this.sessionModel.deleteMany({ userId }, { session });
  }
}
