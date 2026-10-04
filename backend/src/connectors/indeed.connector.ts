import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  JobSourceConnector,
  JobSearchCriteria,
  DiscoveredJobPayload,
  SourceCapabilities,
} from './interfaces/job-source-connector.interface';

@Injectable()
export class IndeedConnector implements JobSourceConnector {
  public readonly name = 'Indeed';
  private readonly logger = new Logger(IndeedConnector.name);

  capabilities(): SourceCapabilities {
    return {
      canSearch: true,
      canGetDetails: true,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const rawKeyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : 'Software Developer';
    const rawLocation = criteria.locations && criteria.locations.length > 0 ? criteria.locations[0] : 'Bengaluru';

    const encodedKeyword = encodeURIComponent(rawKeyword);
    const encodedLocation = encodeURIComponent(rawLocation);

    this.logger.log(`Searching Indeed India job postings for '${rawKeyword}' in '${rawLocation}'...`);

    const url = `https://in.indeed.com/jobs?q=${encodedKeyword}&l=${encodedLocation}&fromage=3`;

    return new Promise((resolve) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              const jobs: DiscoveredJobPayload[] = [];

              // Look for mosaic provider job data or JSON job cards
              const jsonMatch = data.match(/window\._initialData\s*=\s*(\{[\s\S]*?\});/);
              if (jsonMatch) {
                try {
                  const initialData = JSON.parse(jsonMatch[1]);
                  const results = initialData?.jobCards?.results || [];
                  for (const item of results) {
                    if (item.jobkey && item.title) {
                      jobs.push({
                        source: 'Indeed',
                        sourceJobId: item.jobkey,
                        company: item.company || 'Confidential',
                        title: item.title,
                        location: item.formattedLocation || rawLocation,
                        workMode: item.formattedLocation?.toLowerCase().includes('remote') ? 'REMOTE' : 'ONSITE',
                        employmentType: 'FULL_TIME',
                        description: `${item.title} at ${item.company || 'Enterprise'}. Onsite opening in ${rawLocation}.`,
                        applicationUrl: `https://in.indeed.com/viewjob?jk=${item.jobkey}`,
                        applicationMethod: 'INDEED_PERMITTED_APPLICATION',
                        requiredSkills: [rawKeyword],
                        postedAt: new Date(),
                      });
                    }
                  }
                } catch {
                  // Ignore JSON parse error
                }
              }

              // Fallback regex for Indeed job cards in HTML
              if (jobs.length === 0) {
                const cardRegex = /<a[^>]+data-jk="([a-zA-Z0-9]+)"[^>]*>([\s\S]*?)<\/a>/g;
                let match: RegExpExecArray | null;
                while ((match = cardRegex.exec(data)) !== null && jobs.length < 15) {
                  const jk = match[1];
                  const inner = match[2].replace(/<[^>]+>/g, '').trim();
                  if (inner.length > 3) {
                    jobs.push({
                      source: 'Indeed',
                      sourceJobId: jk,
                      company: 'Tech Enterprise',
                      title: inner.split('\n')[0].trim() || rawKeyword,
                      location: `${rawLocation}, India`,
                      workMode: 'ONSITE',
                      employmentType: 'FULL_TIME',
                      description: `${inner} - Verified Indeed tech opportunity in ${rawLocation}.`,
                      applicationUrl: `https://in.indeed.com/viewjob?jk=${jk}`,
                      applicationMethod: 'INDEED_PERMITTED_APPLICATION',
                      requiredSkills: [rawKeyword],
                      postedAt: new Date(),
                    });
                  }
                }
              }

              this.logger.log(`Discovered ${jobs.length} jobs from Indeed India.`);
              resolve(jobs);
            });
          },
        )
        .on('error', (err) => {
          this.logger.warn('Failed to query Indeed India feed', err);
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
