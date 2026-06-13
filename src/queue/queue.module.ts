import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { BullQueueName } from './enums/bull-queue-name.enum';
import { BullQueue, BullQueueSchema } from './schema/bull-queue.schema';
import { QueueService } from './services/queue.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BullQueue.name, schema: BullQueueSchema },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
        },
        settings: {
          lockDuration: 10 * 60 * 1000,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: BullQueueName.EMAIL_GOOGLE_BACKFILL },
      { name: BullQueueName.EMAIL_MICROSOFT_BACKFILL },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
