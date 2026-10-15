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
      canGetDetails: false,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : '';
    if (!keyword.trim()) return [];
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

                  if (!item.id || !item.company_name || !item.title || !item.url || !cleanDesc) return null;
                  const pubDate = item.publication_date ? new Date(item.publication_date) : undefined;
                  if (pubDate && (Date.now() - pubDate.getTime() > 14 * 24 * 3600 * 1000)) {
                    return null; // Skip stale postings older than 14 days
                  }
                  return {
                    source: 'Remotive',
                    sourceJobId: String(item.id),
                    company: item.company_name,
                    title: item.title,
                    location: item.candidate_required_location || 'Remote',
                    workMode: 'REMOTE',
                    employmentType: item.job_type ? item.job_type.toUpperCase() : 'FULL_TIME',
                    description: cleanDesc,
                    applicationUrl: item.url,
                    applicationMethod: 'DIRECT_EMPLOYER_PORTAL',
                    requiredSkills: [],
                    preferredSkills: Array.isArray(item.tags) ? item.tags : [],
                    postedAt: item.publication_date ? new Date(item.publication_date) : undefined,
                  };
                }).filter(Boolean) as DiscoveredJobPayload[];

                this.logger.log(`Discovered ${jobs.length} source listings from Remotive.`);
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
