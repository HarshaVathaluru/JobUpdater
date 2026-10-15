import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { RemotiveConnector } from './remotive.connector';
import { JobicyConnector } from './jobicy.connector';
import { ArbeitnowConnector } from './arbeitnow.connector';
import { ShineConnector } from './shine.connector';
import { LinkedInConnector } from './linkedin.connector';
import { IndeedConnector } from './indeed.connector';
import { CandidateService } from '../candidate/candidate.service';

@Processor('job-discovery')
export class DiscoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DiscoveryProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly remotiveConnector: RemotiveConnector,
    private readonly jobicyConnector: JobicyConnector,
    private readonly arbeitnowConnector: ArbeitnowConnector,
    private readonly shineConnector: ShineConnector,
    private readonly linkedinConnector: LinkedInConnector,
    private readonly indeedConnector: IndeedConnector,
    private readonly candidateService: CandidateService,
  ) { super(); }

  async process(job: Job<{ userId?: string }>): Promise<any> {
    const userId = job.data?.userId;
    if (!userId) return { ingested: 0, reason: 'Candidate-specific discovery requires a user profile.' };

    const [preferences, profile] = await Promise.all([
      this.candidateService.getPreferences(userId),
      this.candidateService.getProfile(userId),
    ]);
    const roles: string[] = (preferences?.targetRoles || []).map((value) => value.trim()).filter(Boolean);
    if (!roles.length) {
      const rawTitles = (profile?.experience || []).map((item: any) => item?.title).filter(Boolean);
      for (const t of rawTitles) {
        roles.push(t);
        // Normalize titles by removing intern, trainee, junior, associate to find core professional roles
        const normalized = t.replace(/\b(intern|internship|trainee|associate|junior|jr\.?)\b/gi, '').trim();
        if (normalized.length > 2 && !roles.includes(normalized)) {
          roles.push(normalized);
        }
      }
    }
    const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
    if (profileSkills.some((s: string) => /react|node|javascript|full stack/i.test(s)) && !roles.some(r => /full stack/i.test(r))) {
      roles.push('Full Stack Developer');
    }
    if (profileSkills.some((s: string) => /software|development|programming/i.test(s)) && !roles.some(r => /software developer/i.test(r))) {
      roles.push('Software Developer');
    }
    if (profileSkills.some((s: string) => /test|selenium|qa|automation/i.test(s)) && !roles.some(r => /qa|test/i.test(r))) {
      roles.push('QA Automation Engineer');
    }
    if (!roles.length) {
      roles.push(...profileSkills.slice(0, 5));
    }
    const keywords = [...new Set(roles.filter(Boolean))].slice(0, 6);
    if (!keywords.length) {
      return { ingested: 0, reason: 'Add target roles or upload a resume with skills or work history before discovering jobs.' };
    }

    const preferredLocs = (preferences?.preferredLocations || []).map((v) => v.trim()).filter(Boolean);
    const locSet = new Set<string>(preferredLocs);
    if (profile?.location) {
      locSet.add(profile.location.trim());
      if (/india/i.test(profile.location)) {
        locSet.add('India');
      }
    }
    if (locSet.size === 0) {
      locSet.add('India');
    }
    const locations = [...locSet];

    const connectors = [
      this.linkedinConnector,
      this.shineConnector,
      this.indeedConnector,
      this.remotiveConnector,
      this.jobicyConnector,
      this.arbeitnowConnector,
    ];
    this.logger.log(`Searching job feeds (LinkedIn, Shine, Indeed, Remotive, Jobicy, Arbeitnow) for user ${userId} using ${keywords.length} queries.`);

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
