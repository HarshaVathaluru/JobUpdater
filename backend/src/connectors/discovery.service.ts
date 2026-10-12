import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectQueue('job-discovery') private readonly discoveryQueue: Queue,
  ) {}

  async triggerManualDiscovery(userId: string) {
    const queued = await this.discoveryQueue.add('run-discovery', { userId });
    return { jobId: String(queued.id), message: 'Candidate-specific discovery queued. Results will appear after the feed scan finishes.' };
  }

  async getManualDiscoveryStatus(jobId: string, userId: string) {
    const queued = await this.discoveryQueue.getJob(jobId);
    if (!queued || queued.data?.userId !== userId) throw new NotFoundException('Discovery task not found.');
    return {
      jobId,
      state: await queued.getState(),
      progress: queued.progress,
      result: queued.returnvalue,
      failedReason: queued.failedReason || undefined,
    };
  }
}
