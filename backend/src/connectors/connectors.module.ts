import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DiscoveryService } from './discovery.service';
import { DiscoveryProcessor } from './discovery.processor';
import { DiscoveryController } from './discovery.controller';
import { JobsModule } from '../jobs/jobs.module';
import { CandidateModule } from '../candidate/candidate.module';
import { LinkedInConnector } from './linkedin.connector';
import { NaukriConnector } from './naukri.connector';
import { RemotiveConnector } from './remotive.connector';
import { JobicyConnector } from './jobicy.connector';
import { ArbeitnowConnector } from './arbeitnow.connector';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: 'job-discovery',
    }),
    JobsModule,
    CandidateModule,
  ],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    DiscoveryProcessor,
    LinkedInConnector,
    NaukriConnector,
    RemotiveConnector,
    JobicyConnector,
    ArbeitnowConnector,
  ],
  exports: [DiscoveryService, LinkedInConnector, NaukriConnector, RemotiveConnector, JobicyConnector, ArbeitnowConnector],
})
export class ConnectorsModule {}
