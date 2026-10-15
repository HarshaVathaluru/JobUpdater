import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as https from 'https';
import * as http from 'http';
import { JobEntity } from './entities/job.entity';
import { v4 as uuidv4 } from 'uuid';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { CandidatePreferenceEntity } from '../candidate/entities/candidate-preference.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { scoreResumeAgainstJob } from '../matching/resume-match';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
    @InjectRepository(CandidatePreferenceEntity)
    private readonly preferenceRepo: Repository<CandidatePreferenceEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
  ) {}

  async checkJobLiveness(url: string): Promise<boolean> {
    if (!url) return false;
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.get(
          url,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml',
            },
            timeout: 5000,
          },
          (res) => {
            const statusCode = res.statusCode || 0;
            if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
              const loc = res.headers.location.toLowerCase();
              if (loc.includes('expired') || loc.includes('job-not-found') || loc.includes('closed') || loc.includes('unavailable')) {
                return resolve(false);
              }
              return resolve(true);
            }
            if (statusCode === 404 || statusCode === 410) {
              return resolve(false);
            }
            let body = '';
            res.on('data', (chunk) => {
              if (body.length < 4000) body += chunk;
            });
            res.on('end', () => {
              if (
                body.includes('No longer accepting applications') ||
                body.includes('Job is not available') ||
                body.includes('Page Not Found') ||
                body.includes('This job is closed') ||
                body.includes('job has expired') ||
                body.includes('This position has been filled')
              ) {
                return resolve(false);
              }
              resolve(res.statusCode ? res.statusCode < 400 : true);
            });
          },
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(true);
        });
      } catch {
        resolve(false);
      }
    });
  }

  async ingestJobs(jobsData: Partial<JobEntity>[]) {
    let ingestedCount = 0;

    for (const data of jobsData) {
      try {
        const supportedSources = new Set(['remotive', 'jobicy', 'arbeitnow', 'linkedin', 'shine', 'indeed']);
        const invalidCompanies = new Set(['tech company', 'technology company', 'hiring company', 'confidential']);
        let applicationUrl: URL;
        try {
          applicationUrl = new URL(data.applicationUrl || '');
        } catch {
          continue;
        }
        if (
          !data.source || !supportedSources.has(data.source.toLowerCase()) ||
          !data.sourceJobId || !data.company || invalidCompanies.has(data.company.trim().toLowerCase()) ||
          !data.title || !data.description || data.description.trim().length < 40 ||
          !['http:', 'https:'].includes(applicationUrl.protocol)
        ) {
          continue;
        }

        // Verify live availability before ingesting
        const isLive = await this.checkJobLiveness(applicationUrl.toString());
        if (!isLive) {
          this.logger.debug(`Skipping dead/unavailable job: ${data.title} at ${data.company} -> ${applicationUrl}`);
          continue;
        }

        // Deduplicate: check if this job was already ingested
        let existingJob: JobEntity | null = null;
        let sameSourceRecord = false;
        if (data.sourceJobId) {
          existingJob = await this.jobRepo.findOne({
            where: { source: data.source, sourceJobId: data.sourceJobId },
          });
          sameSourceRecord = Boolean(existingJob);
        }
        if (!existingJob) {
          existingJob = await this.jobRepo.findOne({
            where: { company: data.company, title: data.title },
          });
        }

        if (existingJob) {
          if (!sameSourceRecord) continue;
          Object.assign(existingJob, {
            source: data.source,
            company: data.company,
            title: data.title,
            location: data.location || null,
            workMode: data.workMode || null,
            employmentType: data.employmentType || null,
            description: data.description,
            requiredSkills: data.requiredSkills || [],
            preferredSkills: data.preferredSkills || [],
            responsibilities: data.responsibilities || [],
            educationRequirements: data.educationRequirements || [],
            otherRequirements: data.otherRequirements || [],
            applicationUrl: applicationUrl.toString(),
            applicationMethod: data.applicationMethod || null,
            postedAt: data.postedAt || existingJob.postedAt,
            isActive: true,
          });
          await this.jobRepo.save(existingJob);
          continue;
        }

        const newJob = this.jobRepo.create({
          id: uuidv4(),
          source: (data as any).source || 'Job Board',
          company: data.company,
          title: data.title,
          location: data.location || null,
          workMode: data.workMode || null,
          employmentType: data.employmentType || null,
          description: data.description,
          requiredSkills: data.requiredSkills || [],
          preferredSkills: data.preferredSkills || [],
          responsibilities: data.responsibilities || [],
          educationRequirements: data.educationRequirements || [],
          otherRequirements: data.otherRequirements || [],
          applicationUrl: applicationUrl.toString(),
          applicationMethod: data.applicationMethod || null,
          sourceJobId: data.sourceJobId,
          isActive: true,
          postedAt: data.postedAt || null,
        } as Partial<JobEntity>);

        await this.jobRepo.save(newJob);
        ingestedCount++;
      } catch (error) {
        this.logger.error(`Failed to ingest job: ${data.title} at ${data.company}`, error);
      }
    }

    return ingestedCount;
  }

  async getJobs(limit = 500) {
    const jobs = await this.jobRepo.createQueryBuilder('job')
      .where('job.isActive = :active', { active: true })
      .andWhere('(job.expiresAt IS NULL OR job.expiresAt > :now)', { now: new Date() })
      .orderBy('job.postedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('job.createdAt', 'DESC')
      .take(limit * 2)
      .getMany();

    const placeholderCompanies = new Set(['tech company', 'technology company', 'hiring company', 'confidential']);
    const realJobs = jobs.filter((job) => {
      let url: URL;
      try { url = new URL(job.applicationUrl || ''); } catch { return false; }
      const description = (job.description || '').toLowerCase();
      return ['https:', 'http:'].includes(url.protocol) &&
        !placeholderCompanies.has((job.company || '').trim().toLowerCase()) &&
        !description.startsWith('exciting ');
    });
    return realJobs.slice(0, limit);
  }

  async saveExternalJobForCandidate(userId: string, input: {
    source: string;
    title: string;
    company: string;
    location?: string;
    description: string;
    applicationUrl: string;
    employerApplicationUrl?: string;
  }) {
    const source = String(input.source || '').trim().toLowerCase();
    if (!['linkedin', 'shine', 'indeed'].includes(source)) {
      throw new BadRequestException('Choose LinkedIn, Shine, or Indeed as the listing source.');
    }
    let listingUrl: URL;
    try {
      listingUrl = new URL(input.applicationUrl);
    } catch {
      throw new BadRequestException('Enter the full URL of the job listing.');
    }
    const host = listingUrl.hostname.toLowerCase();
    const matchesHost = source === 'linkedin'
      ? host === 'linkedin.com' || host.endsWith('.linkedin.com')
      : source === 'shine'
      ? host === 'shine.com' || host.endsWith('.shine.com')
      : host === 'indeed.com' || host.includes('indeed.com');
    if (!matchesHost || !['https:', 'http:'].includes(listingUrl.protocol)) {
      throw new BadRequestException(`The listing URL must belong to ${source}.`);
    }
    const title = String(input.title || '').trim();
    const company = String(input.company || '').trim();
    const description = String(input.description || '').trim();
    if (title.length < 2 || company.length < 2 || description.length < 40) {
      throw new BadRequestException('Add the actual job title, company, and full description (at least 40 characters).');
    }
    const canonicalUrl = listingUrl.toString();
    const existing = await this.jobRepo.findOne({ where: { candidateOwnerId: userId, source, sourceJobId: canonicalUrl } });
    if (existing) return existing;
    let employerUrl = canonicalUrl;
    if (input.employerApplicationUrl?.trim()) {
      try {
        const parsedEmployerUrl = new URL(input.employerApplicationUrl.trim());
        if (!['https:', 'http:'].includes(parsedEmployerUrl.protocol)) throw new Error('unsupported protocol');
        employerUrl = parsedEmployerUrl.toString();
      } catch {
        throw new BadRequestException('Enter a valid employer application URL, or leave that field blank.');
      }
    }

    const job = this.jobRepo.create({
      id: uuidv4(),
      candidateOwnerId: userId,
      source,
      sourceJobId: canonicalUrl,
      company,
      title,
      location: String(input.location || '').trim() || null,
      description,
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      educationRequirements: [],
      otherRequirements: [],
      applicationUrl: employerUrl,
      applicationMethod: 'CANDIDATE_IMPORTED_REQUIRES_INTERACTIVE_PLATFORM_SESSION',
      isActive: true,
      rawData: { candidateProvided: true, sourceListingUrl: canonicalUrl },
    } as Partial<JobEntity>);
    return this.jobRepo.save(job);
  }

  async getJobsForCandidate(
    userId: string,
    options?: {
      limit?: number;
      postedWithinDays?: number;
      experienceLevel?: 'ALL' | 'ENTRY' | 'MID' | 'SENIOR';
      hideLinkedIn?: boolean;
      hideShine?: boolean;
    },
  ) {
    const limit = options?.limit || 500;
    const [publicJobs, candidateJobs, profile, preferences] = await Promise.all([
      this.getJobs(limit),
      this.jobRepo.find({ where: { candidateOwnerId: userId, isActive: true }, order: { createdAt: 'DESC' }, take: limit }),
      this.profileRepo.findOne({ where: { userId } }),
      this.preferenceRepo.findOne({ where: { userId } }),
    ]);

    let resume = await this.resumeRepo.findOne({ where: { userId, isMaster: true } });
    if (!resume) {
      resume = await this.resumeRepo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
    }

    // Combine and deduplicate
    const combined = [...candidateJobs, ...publicJobs];
    const uniqueMap = new Map<string, JobEntity>();
    for (const j of combined) {
      if (!uniqueMap.has(j.id)) uniqueMap.set(j.id, j);
    }
    const jobs = Array.from(uniqueMap.values());
    const resumeText = resume?.extractedText || '';

    let enriched = jobs.map((job) => {
      // Calculate job required experience level
      let expMin = job.experienceMin ?? null;
      let expMax = job.experienceMax ?? null;
      let level: 'ENTRY' | 'MID' | 'SENIOR' = 'ENTRY';

      if (expMin !== null && expMin !== undefined) {
        if (expMin >= 5) level = 'SENIOR';
        else if (expMin >= 2) level = 'MID';
        else level = 'ENTRY';
      } else {
        const title = (job.title || '').toLowerCase();
        if (/\b(senior|sr\.?|lead|principal|architect|staff|director|manager|head|sde iii|sde 3|engineer iii|level 3|level iii)\b/i.test(title)) {
          level = 'SENIOR';
          expMin = 5;
          expMax = 12;
        } else if (/\b(sde ii|sde 2|engineer ii|level 2|intermediate|mid level)\b/i.test(title)) {
          level = 'MID';
          expMin = 2;
          expMax = 5;
        } else {
          level = 'ENTRY';
          expMin = 0;
          expMax = 2;
        }
      }

      const experienceLabel = expMin !== null
        ? (expMax && expMax < 90 ? `${expMin}-${expMax} yrs` : `${expMin}+ yrs`)
        : (level === 'ENTRY' ? '0-2 yrs (Entry)' : level === 'MID' ? '2-5 yrs (Mid)' : '5+ yrs (Senior)');

      // Live posting calculation (within last 1-2 days / 48 hours)
      const postDate = job.postedAt ? new Date(job.postedAt) : new Date(job.createdAt);
      const ageHours = (Date.now() - postDate.getTime()) / (3600 * 1000);
      const isFresh = ageHours <= 48;

      return {
        ...job,
        experienceLevel: level,
        experienceMin: expMin,
        experienceMax: expMax,
        experienceLabel,
        isFresh,
        ageHours: Math.round(ageHours),
        resumeMatch: scoreResumeAgainstJob(job, profile, resumeText),
        preferenceMatch: {
          role: !preferences?.targetRoles?.length || preferences.targetRoles.some((role) =>
            `${job.title} ${job.description}`.toLowerCase().includes(role.toLowerCase())),
          location: !preferences?.preferredLocations?.length || preferences.willingToRelocate ||
            preferences.preferredLocations.some((location) => (job.location || '').toLowerCase().includes(location.toLowerCase())) ||
            (job.workMode || '').toUpperCase() === 'REMOTE',
          workMode: !preferences?.workMode || preferences.workMode === 'ANY' ||
            (job.workMode || '').toUpperCase() === preferences.workMode.toUpperCase(),
        },
      };
    });

    // Apply server-side filters if requested
    if (options?.hideLinkedIn) {
      enriched = enriched.filter((j) => (j.source || '').toLowerCase() !== 'linkedin');
    }
    if (options?.hideShine) {
      enriched = enriched.filter((j) => (j.source || '').toLowerCase() !== 'shine');
    }
    if (options?.postedWithinDays) {
      const maxAgeHours = options.postedWithinDays * 24;
      enriched = enriched.filter((j) => j.ageHours <= maxAgeHours);
    }
    if (options?.experienceLevel && options.experienceLevel !== 'ALL') {
      enriched = enriched.filter((j) => j.experienceLevel === options.experienceLevel);
    }

    return enriched.sort((a, b) => (b.resumeMatch?.score ?? -1) - (a.resumeMatch?.score ?? -1));
  }

  async getJobById(id: string, userId: string) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (job?.candidateOwnerId && job.candidateOwnerId !== userId) return null;
    return job;
  }
}
