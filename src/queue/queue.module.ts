import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { QueueName } from './enums/queue-name.enum';
import EmailQueueSchema, { EmailQueue } from './schema/email-queue.schema';
import { QueueService } from './services/queue.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailQueue.name, schema: EmailQueueSchema },
    ]),
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
      { name: QueueName.EMAIL_GOOGLE_BACKFILL },
      { name: QueueName.EMAIL_MICROSOFT_BACKFILL },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
