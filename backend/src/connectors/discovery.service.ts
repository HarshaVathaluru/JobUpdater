import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class DiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectQueue('job-discovery') private readonly discoveryQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Initializing Discovery Scheduler...');
      // Schedule daily discovery repeat job to run every midnight (0 0 * * *) for daily fresh jobs
      await this.discoveryQueue.add(
        'run-discovery',
        {},
        {
          repeat: { pattern: '0 0 * * *' },
        },
      );
    } catch (err: any) {
      this.logger.warn(`Discovery scheduler could not register repeating job: ${err?.message}`);
    }
  }

  async triggerManualDiscovery(userId?: string) {
    await this.discoveryQueue.add('run-discovery', { userId });
    return { message: 'Discovery triggered successfully. Scanning job platforms...' };
  }
}
