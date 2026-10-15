import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  JobSourceConnector,
  JobSearchCriteria,
  DiscoveredJobPayload,
  SourceCapabilities,
} from './interfaces/job-source-connector.interface';

@Injectable()
export class ArbeitnowConnector implements JobSourceConnector {
  public readonly name = 'Arbeitnow';
  private readonly logger = new Logger(ArbeitnowConnector.name);

  capabilities(): SourceCapabilities {
    return {
      canSearch: true,
      canGetDetails: false,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0].toLowerCase() : '';
    if (!keyword.trim()) return [];
    this.logger.log(`Searching Arbeitnow live job feed for '${keyword}'...`);

    const url = 'https://www.arbeitnow.com/api/job-board-api';

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
                const rawJobs = parsed.data || [];

                // Filter jobs matching the keyword in title, tags, or description
                const matched = rawJobs.filter((item: any) => {
                  const title = (item.title || '').toLowerCase();
                  const tags = (Array.isArray(item.tags) ? item.tags : []).join(' ').toLowerCase();
                  const desc = (item.description || '').toLowerCase();
                  return title.includes(keyword) || tags.includes(keyword) || desc.includes(keyword);
                });

                const selection = matched.slice(0, 15);

                const jobs: DiscoveredJobPayload[] = selection.map((item: any) => {
                  const cleanDesc = (item.description || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  if (!item.slug || !item.company_name || !item.title || !item.url || !cleanDesc) return null;
                  const pubDate = item.created_at ? new Date(typeof item.created_at === 'number' ? item.created_at * 1000 : item.created_at) : undefined;
                  if (pubDate && !isNaN(pubDate.getTime()) && (Date.now() - pubDate.getTime() > 21 * 24 * 3600 * 1000)) {
                    return null; // Skip stale postings older than 21 days
                  }
                  return {
                    source: 'Arbeitnow',
                    sourceJobId: item.slug,
                    company: item.company_name,
                    title: item.title,
                    location: item.location || (item.remote ? 'Remote' : ''),
                    workMode: item.remote ? 'REMOTE' : undefined,
                    description: cleanDesc,
                    requiredSkills: [],
                    preferredSkills: Array.isArray(item.tags) ? item.tags : [],
                    applicationUrl: item.url,
                    postedAt: item.created_at ? new Date(item.created_at) : undefined,
                    rawData: {
                      tags: item.tags,
                      remote: item.remote,
                      source: 'arbeitnow_api',
                    },
                  };
                }).filter(Boolean) as DiscoveredJobPayload[];

                this.logger.log(`Arbeitnow returned ${jobs.length} relevant vacancies.`);
                resolve(jobs);
              } catch (err) {
                this.logger.error('Failed to parse Arbeitnow response', err);
                resolve([]);
              }
            });
          },
        )
        .on('error', (err) => {
          this.logger.error('Arbeitnow API network failure', err);
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
