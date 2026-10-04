import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { LinkedInConnector } from './linkedin.connector';
import { NaukriConnector } from './naukri.connector';
import { ShineConnector } from './shine.connector';
import { IndeedConnector } from './indeed.connector';
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
    private readonly shineConnector: ShineConnector,
    private readonly indeedConnector: IndeedConnector,
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

    // Check candidate preferences and profile
    if (job.data?.userId) {
      const preferences = await this.candidateService.getPreferences(job.data.userId);
      if (preferences && preferences.targetRoles && preferences.targetRoles.length > 0) {
        keywords = preferences.targetRoles;
        locations = preferences.preferredLocations || [];
      } else {
        const profile = await this.candidateService.getProfile(job.data.userId);
        if (profile) {
          if (profile.skills && profile.skills.length > 0) {
            keywords = ['Software Developer', 'Full Stack Developer', 'QA Automation Engineer', 'Java Developer'];
          }
          if (profile.location) {
            locations = [profile.location, 'Bengaluru', 'Hyderabad', 'Pune'];
          }
        }
      }
    }

    if (keywords.length === 0) {
      keywords = [
        'Software Developer',
        'Full Stack Developer',
        'QA Automation Engineer',
        'Java Developer',
        'Automation Tester',
      ];
    }
    if (locations.length === 0) {
      locations = ['Bengaluru', 'Hyderabad', 'Pune', 'India'];
    }

    this.logger.log(
      `Executing multi-source discovery across LinkedIn, Shine, Indeed, Remotive, Jobicy, Arbeitnow with keywords: [${keywords.join(', ')}]`,
    );

    let totalIngested = 0;

    for (const kw of keywords) {
      for (const loc of locations.slice(0, 3)) {
        const criteria = { keywords: [kw], locations: [loc] };

        // 1. LinkedIn (Onsite, Hybrid, Remote)
        try {
          const rawLinkedInJobs = await this.linkedInConnector.searchJobs(criteria);
          if (rawLinkedInJobs.length > 0) {
            const count = await this.jobsService.ingestJobs(rawLinkedInJobs);
            totalIngested += count;
            this.logger.log(`Ingested ${count} jobs from LinkedIn for "${kw}" in "${loc}"`);
          }
        } catch (err) {
          this.logger.warn(`LinkedIn discovery error for "${kw}"`, err);
        }

        // 2. Shine.com (Verified Onsite Indian tech hubs)
        try {
          const rawShineJobs = await this.shineConnector.searchJobs(criteria);
          if (rawShineJobs.length > 0) {
            const count = await this.jobsService.ingestJobs(rawShineJobs);
            totalIngested += count;
            this.logger.log(`Ingested ${count} genuine onsite jobs from Shine for "${kw}" in "${loc}"`);
          }
        } catch (err) {
          this.logger.warn(`Shine discovery error for "${kw}"`, err);
        }

        // 3. Indeed India
        try {
          const rawIndeedJobs = await this.indeedConnector.searchJobs(criteria);
          if (rawIndeedJobs.length > 0) {
            const count = await this.jobsService.ingestJobs(rawIndeedJobs);
            totalIngested += count;
            this.logger.log(`Ingested ${count} jobs from Indeed for "${kw}" in "${loc}"`);
          }
        } catch (err) {
          this.logger.warn(`Indeed discovery error for "${kw}"`, err);
        }
      }

      // Global feeds per keyword
      const globalCriteria = { keywords: [kw], locations };

      // 4. Remotive
      try {
        const rawRemotiveJobs = await this.remotiveConnector.searchJobs(globalCriteria);
        if (rawRemotiveJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(rawRemotiveJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} jobs from Remotive for "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`Remotive discovery error for "${kw}"`, err);
      }

      // 5. Jobicy
      try {
        const rawJobicyJobs = await this.jobicyConnector.searchJobs(globalCriteria);
        if (rawJobicyJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(rawJobicyJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} jobs from Jobicy for "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`Jobicy discovery error for "${kw}"`, err);
      }

      // 6. Arbeitnow
      try {
        const rawArbeitnowJobs = await this.arbeitnowConnector.searchJobs(globalCriteria);
        if (rawArbeitnowJobs.length > 0) {
          const count = await this.jobsService.ingestJobs(rawArbeitnowJobs);
          totalIngested += count;
          this.logger.log(`Ingested ${count} jobs from Arbeitnow for "${kw}"`);
        }
      } catch (err) {
        this.logger.warn(`Arbeitnow discovery error for "${kw}"`, err);
      }
    }

    this.logger.log(`Discovery run completed. Total new jobs ingested: ${totalIngested}`);
    return { ingested: totalIngested };
  }
}
