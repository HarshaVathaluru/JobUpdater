import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DiscoveryProcessor } from './discovery.processor';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectQueue('job-discovery') private readonly discoveryQueue: Queue,
    private readonly discoveryProcessor: DiscoveryProcessor,
  ) {}

  async triggerManualDiscovery(userId: string) {
    try {
      this.logger.log(`Queueing live job discovery for candidate ${userId}...`);
      const queued = await this.discoveryQueue.add('run-discovery', { userId });
      // Run background processor without blocking the HTTP request to prevent timeout / Network Error
      this.discoveryProcessor.process({ data: { userId } } as any).then((res) => {
        this.logger.log(`Manual live discovery completed: ${res?.ingested || 0} jobs ingested.`);
      }).catch((err) => {
        this.logger.warn(`Background discovery encountered error: ${err.message}`);
      });

      return {
        success: true,
        jobId: String(queued.id),
        message: 'Live scan initiated! Querying LinkedIn, Shine, and active job feeds in real-time.',
      };
    } catch (err: any) {
      this.logger.error(`Failed to initiate discovery: ${err.message}`);
      return { success: false, message: 'Discovery request queued.' };
    }
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
