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
      canGetDetails: true,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0].toLowerCase() : 'developer';
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
                  const tags = (item.tags || []).join(' ').toLowerCase();
                  const desc = (item.description || '').toLowerCase();
                  return title.includes(keyword) || tags.includes(keyword) || desc.includes(keyword);
                });

                const selection = (matched.length > 0 ? matched : rawJobs).slice(0, 15);

                const jobs: DiscoveredJobPayload[] = selection.map((item: any) => {
                  const cleanDesc = (item.description || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  return {
                    source: 'Arbeitnow',
                    sourceJobId: item.slug || String(Date.now() + Math.random()),
                    company: item.company_name || 'Hiring Company',
                    title: item.title || keyword,
                    location: item.location || (item.remote ? 'Remote' : 'Worldwide'),
                    workMode: item.remote ? 'REMOTE' : 'HYBRID',
                    description: cleanDesc.length > 0 ? cleanDesc : `Exciting ${item.title} opportunity at ${item.company_name}.`,
                    requiredSkills: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['Software Engineering'],
                    applicationUrl: item.url || `https://www.arbeitnow.com/jobs`,
                    rawData: {
                      tags: item.tags,
                      remote: item.remote,
                      source: 'arbeitnow_api',
                    },
                  };
                });

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
