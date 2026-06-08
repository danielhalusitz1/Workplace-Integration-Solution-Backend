import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { ExternalAccountModule } from './external-account/external-account.module';
import { AuthGuard } from './guards/auth.guard';
import { MongodbTransactionModule } from './mongodb-transaction/mongodb-transaction.module';
import { UserModule } from './user/user.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserSubscriptionModule } from './user-subscription/user-subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongodbTransactionModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri:
          config.getOrThrow<string>('MONGODB_URI') +
          '/' +
          config.getOrThrow<string>('MONGODB_DB'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      global: true,
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET_KEY'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    UserSettingsModule,
    UserSubscriptionModule,
    ExternalAccountModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
