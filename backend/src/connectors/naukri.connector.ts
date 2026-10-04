import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  JobSourceConnector,
  JobSearchCriteria,
  DiscoveredJobPayload,
  SourceCapabilities,
} from './interfaces/job-source-connector.interface';

@Injectable()
export class NaukriConnector implements JobSourceConnector {
  public readonly name = 'Naukri';
  private readonly logger = new Logger(NaukriConnector.name);

  capabilities(): SourceCapabilities {
    return {
      canSearch: true,
      canGetDetails: true,
      canDirectApply: false,
      requiresAuth: false,
    };
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<DiscoveredJobPayload[]> {
    const keyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords.join(' ') : 'Software Engineer';
    const location = criteria.locations && criteria.locations.length > 0 ? criteria.locations[0] : 'India';

    this.logger.log(`Searching Naukri job feed for '${keyword}' in '${location}'...`);

    const encodedKeyword = encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, '-'));
    const url = `https://www.naukri.com/jobapi/v3/search?noOfResults=20&urlType=search_by_keyword&searchType=adv&keyword=${encodedKeyword}&pageNo=1`;

    return new Promise((resolve) => {
      https
        .get(
          url,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              appid: '109',
              systemid: '109',
              Accept: 'application/json',
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                const rawJobs = parsed.jobDetails || [];
                const jobs: DiscoveredJobPayload[] = rawJobs.map((item: any) => ({
                  source: 'Naukri',
                  sourceJobId: String(item.jobId || item.groupId || Date.now()),
                  company: item.companyName || 'Confidential',
                  title: item.title || keyword,
                  location: item.placeholders?.[2]?.label || location,
                  workMode: 'HYBRID',
                  employmentType: 'FULL_TIME',
                  description: item.jobDescription || `${item.title} at ${item.companyName}`,
                  applicationUrl: item.staticUrl || `https://www.naukri.com/job-listings-${item.jobId}`,
                  applicationMethod: 'NAUKRI_PERMITTED_APPLICATION',
                  requiredSkills: (item.tagsAndSkills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
                  postedAt: new Date(),
                }));

                this.logger.log(`Discovered ${jobs.length} jobs from Naukri.`);
                resolve(jobs);
              } catch (e) {
                // If Naukri API requires browser headers, return empty array cleanly
                this.logger.warn('Naukri search response parse skipped', e);
                resolve([]);
              }
            });
          },
        )
        .on('error', (err) => {
          this.logger.warn('Failed to query Naukri feed', err);
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
