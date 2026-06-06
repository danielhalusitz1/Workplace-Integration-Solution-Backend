import { Global, Module } from '@nestjs/common';

import { MongodbTransactionService } from './mongodb-transaction.service';

@Global()
@Module({
  providers: [MongodbTransactionService],
  exports: [MongodbTransactionService],
})
export class MongodbTransactionModule {}
