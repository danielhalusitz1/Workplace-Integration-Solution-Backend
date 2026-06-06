import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExternalAccountModule } from 'src/external-account/external-account.module';
import { GoogleClientModule } from 'src/google-client/google-client.module';
import { MicrosoftClientModule } from 'src/microsoft-client/microsoft-client.module';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { UserModule } from 'src/user/user.module';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';

import { AuthController } from './controllers/auth.controller';
import { Session, SessionSchema } from './schemas/session.schema';
import { AuthService } from './services/auth.service';
import { AuthGoogleService } from './services/auth-google.service';
import { AuthMicrosoftService } from './services/auth-microsoft.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
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
