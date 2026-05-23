import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';

@Injectable()
export class MongodbTransactionService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async withTransaction<T>(
    callback: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();

    try {
      let result: T;

      await session.withTransaction(async () => {
        result = await callback(session);
      });

      return result!;
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
