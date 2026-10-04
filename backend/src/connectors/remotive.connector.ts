import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  JobSourceConnector,
  JobSearchCriteria,
  DiscoveredJobPayload,
  SourceCapabilities,
} from './interfaces/job-source-connector.interface';

@Injectable()
export class RemotiveConnector implements JobSourceConnector {
  public readonly name = 'Remotive';
  private readonly logger = new Logger(RemotiveConnector.name);

  capabilities(): SourceCapabilities {
    return {
      canSearch: true,
      canGetDetails: true,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : 'developer';
    this.logger.log(`Searching Remotive live jobs for '${keyword}'...`);

    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://remotive.com/api/remote-jobs?search=${encodedKeyword}&limit=15`;

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
                  const cleanDesc = (item.description || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  return {
                    source: 'Remotive',
                    sourceJobId: String(item.id || Date.now()),
                    company: item.company_name || 'Tech Company',
                    title: item.title || keyword,
                    location: item.candidate_required_location || 'Remote / Worldwide',
                    workMode: 'REMOTE',
                    employmentType: item.job_type ? item.job_type.toUpperCase() : 'FULL_TIME',
                    description: cleanDesc || `${item.title} at ${item.company_name}`,
                    applicationUrl: item.url || `https://remotive.com/remote-jobs/${item.id}`,
                    applicationMethod: 'DIRECT_EMPLOYER_PORTAL',
                    requiredSkills: Array.isArray(item.tags) ? item.tags : [keyword],
                    postedAt: item.publication_date ? new Date(item.publication_date) : new Date(),
                  };
                });

                this.logger.log(`Discovered ${jobs.length} verified jobs from Remotive.`);
                resolve(jobs);
              } catch (e) {
                this.logger.warn('Failed to parse Remotive response', e);
                resolve([]);
              }
            });
          },
        )
        .on('error', (err) => {
          this.logger.warn('Remotive connection error', err);
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
