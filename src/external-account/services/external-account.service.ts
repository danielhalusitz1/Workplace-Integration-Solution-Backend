import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, QueryOptions, UpdateQuery } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { UserDTO } from 'src/user/dto/user.dto';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { UserSubscriptionService } from 'src/user-subscription/services/user-subscription.service';
import { encrypt } from 'src/utils/encrypt';

import { ExternalAccountConnectDTO } from '../dto/external-account-connect.dto';
import { ExternalAccountCreateDTO } from '../dto/external-account-create.dto';
import { ExternalAccountDeleteDTO } from '../dto/external-account-delete.dto';
import { ExternalAccountListDTO } from '../dto/external-account-list.dto';
import { ValidateConnectionDTO } from '../dto/external-account-validate-connection.dto';
import {
  ExternalAccount,
  ExternalAccountDocument,
} from '../schemas/external-account.schema';

@Injectable()
export class ExternalAccountService {
  constructor(
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,
    private readonly userSettingsService: UserSettingsService,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  async list(payload: ExternalAccountListDTO) {
    const { userId } = payload;
    return this.externalAccountModel
      .find({ userId })
      .sort({ type: 1, createdAt: -1 });
  }

  async delete(payload: ExternalAccountDeleteDTO, user: UserDTO) {
    const userSettings = await this.userSettingsService.findOneByFilters({
      userId: user._id.toString(),
    });

    if (userSettings?.primaryExternalAccount === payload._id.toString()) {
      throw new BadRequestException(
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_DELETE_IS_PRIMARY,
      );
    }

    const result = await this.externalAccountModel.deleteOne({
      _id: payload._id,
      userId: user._id.toString(),
    });

    if (result.deletedCount === 0) {
      throw new BadRequestException(
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_DELETE_NOT_SUCCESS,
      );
    }
  }

  async create(
    payload: ExternalAccountCreateDTO,
  ): Promise<ExternalAccountDocument> {
    const {
      _id,
      userId,
      foreignId,
      email,
      type,
      refreshTokenEncrypted,
      accessTokenEncrypted,
      expiryDate,
      session,
    } = payload;

    await this.validateConnectionLimit({ userId, type, session });

    return (
      await this.externalAccountModel.create(
        [
          {
            _id,
            userId,
            foreignId,
            type,
            refreshTokenEncrypted,
            accessTokenEncrypted,
            expiryDate,
            email,
            connected: true,
          },
        ],
        { session },
      )
    )[0];
  }

  async connect(payload: ExternalAccountConnectDTO) {
    const {
      foreignId,
      accessToken,
      email,
      expiryDate,
      refreshToken,
      type,
      userId,
      session,
    } = payload;

    const existingForeignAccount = await this.externalAccountModel.findOne(
      { foreignId },
      null,
      { session },
    );

    if (existingForeignAccount) {
      if (existingForeignAccount.userId !== userId) {
        throw new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_USER_ID_MISMATCH,
        );
      }

      if (existingForeignAccount.connected) {
        throw new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_ALREADY_CONNECTED,
        );
      }

      await this.validateConnectionLimit({ userId, type, session });

      await this.externalAccountModel.updateOne(
        { foreignId, userId, type },
        {
          foreignId,
          refreshTokenEncrypted: encrypt(refreshToken),
          accessTokenEncrypted: encrypt(accessToken),
          expiryDate,
          email,
          connected: true,
        },
        { session },
      );
    } else {
      await this.create({
        foreignId,
        refreshTokenEncrypted: encrypt(refreshToken),
        accessTokenEncrypted: encrypt(accessToken),
        expiryDate,
        email,
        userId,
        type,
        session,
      });
    }
  }

  private async validateConnectionLimit(payload: ValidateConnectionDTO) {
    const { userId, type, session } = payload;

    const userSubscription = await this.userSubscriptionService.getByUserId({
      userId,
      session,
    });

    const externalAccountCount = await this.externalAccountModel.countDocuments(
      { userId, type },
      { session },
    );
    if (userSubscription.externalAccountPerTypeLimit <= externalAccountCount) {
      throw new BadRequestException(
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_VALIDATE_CONNECTION_LIMIT_LIMIT_REACHED,
      );
    }
  }

  async findOneByFilters(
    filters: QueryFilter<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ) {
    return this.externalAccountModel.findOne(filters, null, options);
  }

  async findByFilters(
    filters: QueryFilter<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ) {
    return this.externalAccountModel.find(filters, null, options);
  }

  findByFiltersCursor(
    filters: QueryFilter<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ) {
    return this.externalAccountModel
      .find(filters, null, options)
      .lean()
      .cursor();
  }

  async updateByFilters(
    filters: QueryFilter<ExternalAccount>,
    update: UpdateQuery<ExternalAccount>,
    options?: QueryOptions<ExternalAccount>,
  ): Promise<ExternalAccountDocument | null> {
    return this.externalAccountModel.findOneAndUpdate(filters, update, options);
  }
}
