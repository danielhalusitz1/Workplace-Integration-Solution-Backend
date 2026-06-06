import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';

import { MongodbTransactionService } from '../../mongodb-transaction/mongodb-transaction.service';

@Injectable()
export class MockMongodbTransactionService extends MongodbTransactionService {
  constructor() {
    super(null as never);
  }

  async withTransaction<T>(
    callback: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    return callback(undefined as unknown as ClientSession);
  }
}
