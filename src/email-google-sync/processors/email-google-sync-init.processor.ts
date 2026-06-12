import { InjectQueue, Process, Processor } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { QueueName } from 'src/queue/enums/queue-name.enum';

@Processor(QueueName.EMAIL_GOOGLE_SYNC_INIT)
export class EmailGoogleSyncInitProcessor {
  constructor(
    @InjectQueue(QueueName.EMAIL_GOOGLE_SYNC_CHUNK)
    private readonly emailGoogleSyncChunkQueue: Queue,
  ) {}

  @Process()
  async handle(job: Job<{ userId: string }>) {
    const { userId } = job.data;

    const now = new Date();

    for (let i = 0; i < 3; i++) {
      const from = new Date();
      from.setDate(now.getDate() - (i + 1));

      const to = new Date();
      to.setDate(now.getDate() - i);

      await this.emailGoogleSyncChunkQueue.add(
        QueueName.EMAIL_GOOGLE_SYNC_CHUNK,
        {
          userId,
          from,
          to,
        },
      );
    }
  }
}
