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
      canGetDetails: false,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : '';
    if (!keyword.trim()) return [];
    this.logger.log(`Searching Jobicy live feed for '${keyword}'...`);

    const tag = keyword.toLowerCase().includes('full') ? 'full-stack' : keyword.toLowerCase().includes('back') ? 'backend' : 'dev';
    const url = `https://jobicy.com/api/v2/remote-jobs?count=15&tag=${tag}`;

    const apiKey = process.env.JOBICY_API_KEY?.trim();
    return new Promise((resolve) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'application/json',
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                const rawJobs = (parsed.jobs || []).filter((item: any) => {
                  const queryTerms = keyword.toLowerCase().split(/[^a-z0-9+#.]+/).filter((term) => term.length > 2);
                  const industries = Array.isArray(item.jobIndustry) ? item.jobIndustry.join(' ') : String(item.jobIndustry || '');
                  const haystack = `${item.jobTitle || ''} ${item.jobDescription || ''} ${industries}`.toLowerCase();
                  return queryTerms.length > 0 && queryTerms.some((term) => haystack.includes(term));
                });
                const jobs: DiscoveredJobPayload[] = rawJobs.map((item: any) => {
                  const cleanDesc = (item.jobDescription || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  if (!item.id || !item.companyName || !item.jobTitle || !item.url || !cleanDesc) return null;
                  return {
                    source: 'Jobicy',
                    sourceJobId: String(item.id),
                    company: item.companyName,
                    title: item.jobTitle,
                    location: item.jobGeo || 'Remote',
                    workMode: 'REMOTE',
                    employmentType: item.jobType ? item.jobType[0]?.toUpperCase() : 'FULL_TIME',
                    description: cleanDesc,
                    applicationUrl: item.url,
                    applicationMethod: (() => {
                      try {
                        const host = new URL(item.url).hostname.toLowerCase();
                        return host === 'jobicy.com' || host.endsWith('.jobicy.com')
                          ? 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION'
                          : 'DIRECT_EMPLOYER_PORTAL';
                      } catch {
                        return 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION';
                      }
                    })(),
                    requiredSkills: [],
                    preferredSkills: Array.isArray(item.jobIndustry) ? item.jobIndustry : [],
                    postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
                  };
                }).filter(Boolean) as DiscoveredJobPayload[];

                this.logger.log(`Discovered ${jobs.length} source listings from Jobicy.`);
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
