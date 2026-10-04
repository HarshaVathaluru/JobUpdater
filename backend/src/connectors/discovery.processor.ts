import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { LinkedInConnector } from './linkedin.connector';
import { NaukriConnector } from './naukri.connector';
import { RemotiveConnector } from './remotive.connector';
import { JobicyConnector } from './jobicy.connector';
import { ArbeitnowConnector } from './arbeitnow.connector';
import { CandidateService } from '../candidate/candidate.service';

@Processor('job-discovery')
export class DiscoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DiscoveryProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly linkedInConnector: LinkedInConnector,
    private readonly naukriConnector: NaukriConnector,
    private readonly remotiveConnector: RemotiveConnector,
    private readonly jobicyConnector: JobicyConnector,
    private readonly arbeitnowConnector: ArbeitnowConnector,
    private readonly candidateService: CandidateService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing discovery job ${job.id} for user ${job.data?.userId || 'system'}`);

    let keywords: string[] = [];
    let locations: string[] = [];

    // If userId provided, check candidate preferences
    if (job.data?.userId) {
      const preferences = await this.candidateService.getPreferences(job.data.userId);
      if (preferences) {
        keywords = preferences.targetRoles || [];
        locations = preferences.preferredLocations || [];
      }
    }

    if (keywords.length === 0) {
      keywords = ['Software Engineer', 'Full Stack Developer', 'Backend Engineer'];
    }
    if (locations.length === 0) {
      locations = ['India'];
    }

    this.logger.log(`Executing multi-source discovery across LinkedIn, Remotive, Jobicy, Arbeitnow, Naukri with keywords: [${keywords.join(', ')}]`);

    let totalIngested = 0;

    // Strict 24-hour freshness threshold: Ingest jobs posted today / within the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filterFreshJobs = (jobs: any[]) => {
      return jobs.filter((j) => {
        if (!j.postedAt) return true;
        const posted = new Date(j.postedAt);
        return posted >= oneDayAgo;
      });
    };

    for (const kw of keywords) {
      const criteria = { keywords: [kw], locations };

      // 1. Discover from LinkedIn live guest search (filtered to past 24h via f_TPR=r86400)
      try {
        const rawLinkedInJobs = await this.linkedInConnector.searchJobs(criteria);
        const linkedInJobs = filterFreshJobs(rawLinkedInJobs);
        if (linkedInJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(linkedInJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} fresh daily jobs from LinkedIn for keyword "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`LinkedIn discovery error for keyword "${kw}"`, err);
      }

      // 2. Discover from Remotive (Live remote jobs API)
      try {
        const rawRemotiveJobs = await this.remotiveConnector.searchJobs(criteria);
        const remotiveJobs = filterFreshJobs(rawRemotiveJobs);
        if (remotiveJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(remotiveJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} fresh daily jobs from Remotive for keyword "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`Remotive discovery error for keyword "${kw}"`, err);
      }

      // 3. Discover from Jobicy (Live verified tech feeds)
      try {
        const rawJobicyJobs = await this.jobicyConnector.searchJobs(criteria);
        const jobicyJobs = filterFreshJobs(rawJobicyJobs);
        if (jobicyJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(jobicyJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} fresh daily jobs from Jobicy for keyword "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`Jobicy discovery error for keyword "${kw}"`, err);
      }

      // 4. Discover from Arbeitnow (Global tech jobs API)
      try {
        const rawArbeitnowJobs = await this.arbeitnowConnector.searchJobs(criteria);
        const arbeitnowJobs = filterFreshJobs(rawArbeitnowJobs);
        if (arbeitnowJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(arbeitnowJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} fresh daily jobs from Arbeitnow for keyword "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`Arbeitnow discovery error for keyword "${kw}"`, err);
      }

      // 5. Discover from Naukri
      try {
        const naukriJobs = await this.naukriConnector.searchJobs(criteria);
        if (naukriJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(naukriJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} jobs from Naukri for keyword "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`Naukri discovery error for keyword "${kw}"`, err);
      }
    }

    this.logger.log(`Discovery run completed. Total new jobs ingested: ${totalIngested}`);
    return { ingested: totalIngested };
  }
}
