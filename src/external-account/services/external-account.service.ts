import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model, QueryFilter, QueryOptions } from 'mongoose';
import { ErrorTypes } from 'src/enums/error-types.enum';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { QueueService } from 'src/queue/services/queue.service';
import { UserDTO } from 'src/user/dto/user.dto';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';
import { UserSubscriptionService } from 'src/user-subscription/services/user-subscription.service';
import { encrypt } from 'src/utils/encrypt';

import { ExternalAccountDTO } from '../dto/external-account.dto';
import { ExternalAccountConnectDTO } from '../dto/external-account-connect.dto';
import { ExternalAccountDeleteDTO } from '../dto/external-account-delete.dto';
import { ExternalAccountDisconnectDTO } from '../dto/external-account-disconnect.dto';
import { ExternalAccountListDTO } from '../dto/external-account-list.dto';
import { ExternalAccountSetPrimaryDTO } from '../dto/external-account-set-primary.dto';
import { ValidateConnectionDTO } from '../dto/external-account-validate-connection.dto';
import { ExternalAccountStatus } from '../enums/external-account.status';
import { ExternalAccount } from '../schemas/external-account.schema';

@Injectable()
export class ExternalAccountService {
  constructor(
    @InjectModel(ExternalAccount.name)
    private readonly externalAccountModel: Model<ExternalAccount>,
    private readonly userSettingsService: UserSettingsService,
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly queueService: QueueService,
    private readonly mongodbTransactionService: MongodbTransactionService,
  ) {}

  async list(payload: ExternalAccountListDTO) {
    const { userId } = payload;
    const externalAccounts = await this.externalAccountModel
      .find({
        userId,
        status: {
          $in: [
            ExternalAccountStatus.CONNECTED,
            ExternalAccountStatus.BANNED,
            ExternalAccountStatus.DISCONNECTED,
          ],
        },
      })
      .sort({ type: 1, createdAt: -1 });

    return plainToInstance(ExternalAccountDTO, externalAccounts, {
      excludeExtraneousValues: true,
    });
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

    const result = await this.mongodbTransactionService.withTransaction(
      async (session) => {
        await this.queueService.deleteEmailQueueByExternalAccountId(
          payload._id.toString(),
          session,
        );

        return await this.externalAccountModel.updateOne(
          {
            _id: payload._id,
            userId: user._id.toString(),
          },
          { status: ExternalAccountStatus.DELETED },
          { session },
        );
      },
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException(
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_DELETE_NOT_SUCCESS,
      );
    }
  }

  async connect(payload: ExternalAccountConnectDTO) {
    const {
      _id,
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

      if (existingForeignAccount.status === ExternalAccountStatus.BANNED) {
        throw new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_ACCOUNT_BANNED,
        );
      }

      const updatedExternalAccount =
        await this.externalAccountModel.findOneAndUpdate(
          { foreignId, userId, type },
          {
            foreignId,
            ...(refreshToken
              ? { refreshTokenEncrypted: encrypt(refreshToken) }
              : {}),
            accessTokenEncrypted: encrypt(accessToken),
            expiryDate,
            email,
            status: ExternalAccountStatus.CONNECTED,
          },
          { session },
        );

      if (!updatedExternalAccount) {
        throw new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_NOT_SUCCESS,
        );
      }

      return updatedExternalAccount;
    } else {
      if (!refreshToken) {
        throw new BadRequestException(
          ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_CONNECT_MISSING_REFRESH_TOKEN,
        );
      }

      await this.validateConnectionLimit({ userId, type, session });

      return (
        await this.externalAccountModel.create(
          [
            {
              _id,
              userId,
              foreignId,
              type,
              refreshTokenEncrypted: encrypt(refreshToken),
              accessTokenEncrypted: encrypt(accessToken),
              expiryDate,
              email,
            },
          ],
          { session },
        )
      )[0];
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

  async disconnect(payload: ExternalAccountDisconnectDTO) {
    const { _id } = payload;

    await this.externalAccountModel.updateOne(
      { _id },
      { status: ExternalAccountStatus.DISCONNECTED },
    );
  }

  async setPrimary(payload: ExternalAccountSetPrimaryDTO, user: UserDTO) {
    const { _id } = payload;

    const externalAccount = await this.externalAccountModel.findOne({
      _id,
      userId: user._id.toString(),
      status: {
        $in: [ExternalAccountStatus.CONNECTED],
      },
    });

    if (!externalAccount) {
      throw new NotFoundException(
        ErrorTypes.EXTERNAL_ACCOUNT_SERVICE_SET_PRIMARY_ACCOUNT_NOT_FOUND,
      );
    }

    await this.userSettingsService.updatePrimaryExternalAccount({
      userId: user._id.toString(),
      primaryExternalAccount: _id.toString(),
    });

    return externalAccount;
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
}
