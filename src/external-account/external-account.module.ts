import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ExternalAccountService } from './services/external-account.service';
import {
  ExternalAccount,
  ExternalAccountSchema,
} from './schemas/external-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExternalAccount.name, schema: ExternalAccountSchema },
    ]),
  ],
  providers: [ExternalAccountService],
  exports: [ExternalAccountService],
})
export class ExternalAccountModule {}
