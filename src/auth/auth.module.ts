import { Module } from '@nestjs/common';
import { ExternalAccountModule } from 'src/external-account/external-account.module';
import { GoogleClientModule } from 'src/google-client/google-client.module';
import { MicrosoftClientModule } from 'src/microsoft-client/microsoft-client.module';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { SessionModule } from 'src/session/session.module';
import { UserModule } from 'src/user/user.module';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthGoogleService } from './services/auth-google.service';
import { AuthMicrosoftService } from './services/auth-microsoft.service';

@Module({
  imports: [
    SessionModule,
    ExternalAccountModule,
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
