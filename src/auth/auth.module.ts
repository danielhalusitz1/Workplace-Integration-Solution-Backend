import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoogleClientModule } from 'src/google-client/google-client.module';
import { MicrosoftClientModule } from 'src/microsoft-client/microsoft-client.module';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { UserModule } from 'src/user/user.module';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { AuthController } from './controllers/auth.controller';
import {
  ExternalAccount,
  ExternalAccountSchema,
} from './schemas/external-account.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { AuthService } from './services/auth.service';
import { AuthGoogleService } from './services/auth-google.service';
import { AuthMicrosoftService } from './services/auth-microsoft.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: ExternalAccount.name, schema: ExternalAccountSchema },
    ]),
    GoogleClientModule,
    MicrosoftClientModule,
    UserModule,
    UserSettingsModule,
  ],
  providers: [
    AuthService,
    AuthGoogleService,
    AuthMicrosoftService,
    MongodbTransactionService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
