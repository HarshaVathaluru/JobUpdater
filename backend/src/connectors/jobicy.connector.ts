import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  JobSourceConnector,
  JobSearchCriteria,
  DiscoveredJobPayload,
  SourceCapabilities,
} from './interfaces/job-source-connector.interface';

@Injectable()
export class JobicyConnector implements JobSourceConnector {
  public readonly name = 'Jobicy';
  private readonly logger = new Logger(JobicyConnector.name);

  capabilities(): SourceCapabilities {
    return {
      canSearch: true,
      canGetDetails: true,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : 'dev';
    this.logger.log(`Searching Jobicy live feed for '${keyword}'...`);

    const tag = keyword.toLowerCase().includes('full') ? 'full-stack' : keyword.toLowerCase().includes('back') ? 'backend' : 'dev';
    const url = `https://jobicy.com/api/v2/remote-jobs?count=15&tag=${tag}`;

    return new Promise((resolve) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'application/json',
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                const rawJobs = parsed.jobs || [];
                const jobs: DiscoveredJobPayload[] = rawJobs.map((item: any) => {
                  const cleanDesc = (item.jobDescription || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  return {
                    source: 'Jobicy',
                    sourceJobId: String(item.id || Date.now()),
                    company: item.companyName || 'Technology Company',
                    title: item.jobTitle || keyword,
                    location: item.jobGeo || 'Anywhere / Remote',
                    workMode: 'REMOTE',
                    employmentType: item.jobType ? item.jobType[0]?.toUpperCase() : 'FULL_TIME',
                    description: cleanDesc || `${item.jobTitle} at ${item.companyName}`,
                    applicationUrl: item.url || `https://jobicy.com/jobs/${item.id}`,
                    applicationMethod: 'DIRECT_EMPLOYER_PORTAL',
                    requiredSkills: Array.isArray(item.jobExcerpt) ? item.jobExcerpt : [keyword],
                    postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                  };
                });

                this.logger.log(`Discovered ${jobs.length} verified jobs from Jobicy.`);
                resolve(jobs);
              } catch (e) {
                this.logger.warn('Failed to parse Jobicy response', e);
                resolve([]);
              }
            });
          },
        )
        .on('error', (err) => {
          this.logger.warn('Jobicy connection error', err);
          resolve([]);
        });
    });
  }

  async getJob(jobReference: string): Promise<DiscoveredJobPayload | null> {
    return null;
  }

  async getApplicationEntry(jobReference: string): Promise<string | null> {
    return null;
  }
}
