import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { RemotiveConnector } from './remotive.connector';
import { JobicyConnector } from './jobicy.connector';
import { ArbeitnowConnector } from './arbeitnow.connector';
import { CandidateService } from '../candidate/candidate.service';

@Processor('job-discovery')
export class DiscoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DiscoveryProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly remotiveConnector: RemotiveConnector,
    private readonly jobicyConnector: JobicyConnector,
    private readonly arbeitnowConnector: ArbeitnowConnector,
    private readonly candidateService: CandidateService,
  ) { super(); }

  async process(job: Job<{ userId?: string }>): Promise<any> {
    const userId = job.data?.userId;
    if (!userId) return { ingested: 0, reason: 'Candidate-specific discovery requires a user profile.' };

    const [preferences, profile] = await Promise.all([
      this.candidateService.getPreferences(userId),
      this.candidateService.getProfile(userId),
    ]);
    const roles = (preferences?.targetRoles || []).map((value) => value.trim()).filter(Boolean);
    if (!roles.length) {
      const experienceTitles = (profile?.experience || []).map((item: any) => item?.title).filter(Boolean);
      roles.push(...experienceTitles);
    }
    if (!roles.length) {
      const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
      roles.push(...profileSkills.slice(0, 5));
    }
    const keywords = [...new Set(roles)].slice(0, 8);
    if (!keywords.length) {
      return { ingested: 0, reason: 'Add target roles or upload a resume with skills or work history before discovering jobs.' };
    }

    const locations = [...new Set([
      ...(preferences?.preferredLocations || []),
      ...(!preferences?.preferredLocations?.length && profile?.location ? [profile.location] : []),
    ].map((value) => value.trim()).filter(Boolean))];
    const connectors = [this.remotiveConnector, this.jobicyConnector, this.arbeitnowConnector];
    this.logger.log(`Searching public job feeds for user ${userId} using ${keywords.length} profile-derived queries.`);

    let totalIngested = 0;
    const sourceResults: Record<string, { scanned: number; added: number }> = {};
    const sourceErrors: Array<{ source: string; query: string; message: string }> = [];
    for (const keyword of keywords) {
      for (const connector of connectors) {
        try {
          const found = await connector.searchJobs({ keywords: [keyword], locations });
          const count = await this.jobsService.ingestJobs(found);
          totalIngested += count;
          const current = sourceResults[connector.name] || { scanned: 0, added: 0 };
          sourceResults[connector.name] = { scanned: current.scanned + found.length, added: current.added + count };
          this.logger.log(`${connector.name} returned ${found.length} source records; ${count} new jobs saved for query "${keyword}".`);
        } catch (error) {
          this.logger.warn(`${connector.name} search failed for query "${keyword}"`, error);
          sourceErrors.push({ source: connector.name, query: keyword, message: 'Feed request failed.' });
        }
      }
    }
    return { ingested: totalIngested, sourceResults, sourceErrors };
  }
}
