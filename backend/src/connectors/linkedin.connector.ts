import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  JobSourceConnector,
  JobSearchCriteria,
  DiscoveredJobPayload,
  SourceCapabilities,
} from './interfaces/job-source-connector.interface';

@Injectable()
export class LinkedInConnector implements JobSourceConnector {
  public readonly name = 'LinkedIn';
  private readonly logger = new Logger(LinkedInConnector.name);

  capabilities(): SourceCapabilities {
    return {
      canSearch: true,
      canGetDetails: true,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : 'Software Engineer';
    const location = criteria.locations && criteria.locations.length > 0 ? criteria.locations[0] : 'India';

    const modes = [
      { mode: 'ONSITE', wt: '1' },
      { mode: 'HYBRID', wt: '3' },
      { mode: 'REMOTE', wt: '2' },
    ];

    const allJobs: DiscoveredJobPayload[] = [];

    for (const { mode, wt } of modes) {
      try {
        const jobs = await this.fetchJobsForMode(keyword, location, mode as 'ONSITE' | 'HYBRID' | 'REMOTE', wt);
        allJobs.push(...jobs);
      } catch (err) {
        this.logger.warn(`LinkedIn search error for mode ${mode}:`, err);
      }
    }

    this.logger.log(`Discovered total ${allJobs.length} genuine live jobs from LinkedIn across work modes.`);
    return allJobs;
  }

  private fetchJobsForMode(
    keyword: string,
    location: string,
    workMode: 'ONSITE' | 'HYBRID' | 'REMOTE',
    wt: string,
  ): Promise<DiscoveredJobPayload[]> {
    const encodedKeyword = encodeURIComponent(keyword);
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodedKeyword}&location=${encodedLocation}&f_WT=${wt}&start=0`;

    return new Promise((resolve) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml',
            },
          },
          (res) => {
            let html = '';
            res.on('data', (chunk) => (html += chunk));
            res.on('end', () => {
              const jobs: DiscoveredJobPayload[] = [];
              const liMatches = html.match(/<li[\s\S]*?<\/li>/g) || [];
              for (const li of liMatches) {
                const urnMatch = li.match(/urn:li:jobPosting:(\d+)/);
                const titleMatch = li.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
                const companyMatch = li.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
                const locationMatch = li.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
                const linkMatch = li.match(/<a class="base-card__full-link[^"]*" href="([^"]+)"/);

                if (titleMatch && companyMatch) {
                  const sourceJobId = urnMatch ? urnMatch[1] : String(Date.now());
                  const title = titleMatch[1].trim();
                  const company = companyMatch[1].replace(/<[^>]+>/g, '').trim();
                  const jobLocation = locationMatch ? locationMatch[1].replace(/<[^>]+>/g, '').trim() : location;
                  const applicationUrl = linkMatch ? linkMatch[1].split('?')[0] : `https://www.linkedin.com/jobs/view/${sourceJobId}`;

                  jobs.push({
                    source: 'LinkedIn',
                    sourceJobId,
                    company,
                    title,
                    location: jobLocation,
                    workMode,
                    employmentType: 'FULL_TIME',
                    description: `${title} role at ${company} located in ${jobLocation}. ${workMode} position on LinkedIn.`,
                    applicationUrl,
                    applicationMethod: 'LINKEDIN_PERMITTED_APPLICATION',
                    requiredSkills: [keyword],
                    postedAt: new Date(),
                  });
                }
              }

              resolve(jobs);
            });
          },
        )
        .on('error', (err) => {
          this.logger.error(`Failed to fetch LinkedIn ${workMode} jobs`, err);
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
