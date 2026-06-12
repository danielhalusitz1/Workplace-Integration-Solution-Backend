import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';
import { JobStatus } from 'src/queue/enums/job-status.enum';
import { QueueName } from 'src/queue/enums/queue-name.enum';

@Injectable()
export class EmailGoogleSyncService {
  constructor(
    @InjectQueue(QueueName.EMAIL_GOOGLE_SYNC_INIT)
    private readonly emailGoogleSyncInitQueue: Queue,
  ) {}

  async startGoogleEmailInitialSync(userId: string) {
    await this.emailGoogleSyncInitQueue.add(
      QueueName.EMAIL_GOOGLE_SYNC_INIT,
      { userId },
      {
        priority: 10,
      },
    );
    return {
      status: JobStatus.STARTED,
    };
  }
}
