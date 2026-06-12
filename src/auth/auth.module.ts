import { Module } from '@nestjs/common';
import { EmailGoogleSyncModule } from 'src/email-google-sync/email-google-sync.module';
import { ExternalAccountModule } from 'src/external-account/external-account.module';
import { GoogleClientModule } from 'src/google-client/google-client.module';
import { MicrosoftClientModule } from 'src/microsoft-client/microsoft-client.module';
import { SessionModule } from 'src/session/session.module';
import { UserModule } from 'src/user/user.module';
import { UserSettingsModule } from 'src/user-settings/user-settings.module';
import { UserSubscriptionModule } from 'src/user-subscription/user-subscription.module';

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
    UserSubscriptionModule,
    EmailGoogleSyncModule,
  ],
  providers: [AuthService, AuthGoogleService, AuthMicrosoftService],
  controllers: [AuthController],
})
export class AuthModule {}
