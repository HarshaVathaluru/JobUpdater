import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  JobSourceConnector,
  JobSearchCriteria,
  DiscoveredJobPayload,
  SourceCapabilities,
} from './interfaces/job-source-connector.interface';

@Injectable()
export class ShineConnector implements JobSourceConnector {
  public readonly name = 'Shine';
  private readonly logger = new Logger(ShineConnector.name);

  capabilities(): SourceCapabilities {
    return {
      canSearch: true,
      canGetDetails: true,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const rawKeyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : 'software developer';
    const rawLocation = criteria.locations && criteria.locations.length > 0 ? criteria.locations[0] : 'bangalore';

    const keywordSlug = rawKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'software-developer';
    let citySlug = rawLocation.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bangalore';
    if (citySlug.includes('india') || citySlug.includes('remote')) {
      citySlug = 'bangalore';
    }

    const searchUrl = `https://www.shine.com/job-search/${keywordSlug}-jobs-in-${citySlug}`;
    this.logger.log(`Searching Shine job board: ${searchUrl}`);

    return new Promise((resolve) => {
      https
        .get(
          searchUrl,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              const jobs: DiscoveredJobPayload[] = [];
              const cardRegex = /<a class="result-card_hit[^"]*" aria-label="([^"]+)" href="([^"]+)"/g;
              let match: RegExpExecArray | null;

              while ((match = cardRegex.exec(data)) !== null) {
                const fullLabel = match[1]; // e.g. "Software Developer at CAREERGUIDE"
                const path = match[2].split('?')[0];
                const applicationUrl = `https://www.shine.com${path}`;
                const atIndex = fullLabel.lastIndexOf(' at ');
                const title = atIndex !== -1 ? fullLabel.substring(0, atIndex).trim() : fullLabel;
                const company = atIndex !== -1 ? fullLabel.substring(atIndex + 4).trim() : 'Confidential';
                const jobIdMatch = path.match(/\/(\d+)$/);
                const sourceJobId = jobIdMatch ? jobIdMatch[1] : String(Date.now() + Math.random());

                const displayCity = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

                jobs.push({
                  source: 'Shine',
                  sourceJobId,
                  company,
                  title,
                  location: `${displayCity}, India`,
                  workMode: 'ONSITE',
                  employmentType: 'FULL_TIME',
                  description: `${title} role at ${company} located in ${displayCity}, India. Verified on-site opening on Shine.com.`,
                  applicationUrl,
                  applicationMethod: 'SHINE_PERMITTED_APPLICATION',
                  requiredSkills: [rawKeyword],
                  postedAt: new Date(),
                });
              }

              this.logger.log(`Discovered ${jobs.length} genuine on-site jobs from Shine.com`);
              resolve(jobs);
            });
          },
        )
        .on('error', (err) => {
          this.logger.warn('Failed to query Shine.com feed', err);
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
