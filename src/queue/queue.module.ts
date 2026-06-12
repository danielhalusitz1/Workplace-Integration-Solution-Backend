import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { QueueName } from './enums/queue-name.enum';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QueueName.EMAIL_GOOGLE_SYNC_INIT },
      { name: QueueName.EMAIL_GOOGLE_SYNC_CHUNK },
      { name: QueueName.EMAIL_GOOGLE_SYNC_PAGE },
      { name: QueueName.CALENDAR_GOOGLE_SYNC_INIT },
      { name: QueueName.CALENDAR_GOOGLE_SYNC_CHUNK },
      { name: QueueName.CALENDAR_GOOGLE_SYNC_PAGE },
      { name: QueueName.EMAIL_MICROSOFT_SYNC_INIT },
      { name: QueueName.EMAIL_MICROSOFT_SYNC_CHUNK },
      { name: QueueName.EMAIL_MICROSOFT_SYNC_PAGE },
      { name: QueueName.CALENDAR_MICROSOFT_SYNC_INIT },
      { name: QueueName.CALENDAR_MICROSOFT_SYNC_CHUNK },
      { name: QueueName.CALENDAR_MICROSOFT_SYNC_PAGE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
