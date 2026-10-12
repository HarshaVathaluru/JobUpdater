import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async ingestJobs(jobsData: Partial<JobEntity>[]) {
    let ingestedCount = 0;

    for (const data of jobsData) {
      try {
        const supportedSources = new Set(['remotive', 'jobicy', 'arbeitnow']);
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

  async getJobs(limit = 250) {
    const jobs = await this.jobRepo.createQueryBuilder('job')
      .where('job.isActive = :active', { active: true })
      .andWhere('LOWER(job.source) IN (:...sources)', { sources: ['remotive', 'jobicy', 'arbeitnow'] })
      .andWhere('(job.expiresAt IS NULL OR job.expiresAt > :now)', { now: new Date() })
      .orderBy('job.postedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('job.createdAt', 'DESC')
      .getMany();
    const placeholderCompanies = new Set(['tech company', 'technology company', 'hiring company', 'confidential']);
    const realJobs = jobs.filter((job) => {
      let url: URL;
      try { url = new URL(job.applicationUrl || ''); } catch { return false; }
      const description = (job.description || '').toLowerCase();
      return ['https:', 'http:'].includes(url.protocol) &&
        !placeholderCompanies.has((job.company || '').trim().toLowerCase()) &&
        !description.startsWith('exciting ') &&
        !description.startsWith(`${job.title.toLowerCase()} at ${job.company.toLowerCase()}`);
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
    if (!['linkedin', 'shine'].includes(source)) {
      throw new BadRequestException('Choose LinkedIn or Shine as the listing source.');
    }
    let listingUrl: URL;
    try {
      listingUrl = new URL(input.applicationUrl);
    } catch {
      throw new BadRequestException('Enter the full URL of the LinkedIn or Shine job listing.');
    }
    const host = listingUrl.hostname.toLowerCase();
    const matchesHost = source === 'linkedin'
      ? host === 'linkedin.com' || host.endsWith('.linkedin.com')
      : host === 'shine.com' || host.endsWith('.shine.com');
    if (!matchesHost || !['https:', 'http:'].includes(listingUrl.protocol)) {
      throw new BadRequestException(`The listing URL must belong to ${source === 'linkedin' ? 'LinkedIn' : 'Shine'}.`);
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

  async getJobsForCandidate(userId: string, limit = 250) {
    const [publicJobs, candidateJobs, profile, preferences, resume] = await Promise.all([
      this.getJobs(limit),
      this.jobRepo.find({ where: { candidateOwnerId: userId, isActive: true }, order: { createdAt: 'DESC' }, take: limit }),
      this.profileRepo.findOne({ where: { userId } }),
      this.preferenceRepo.findOne({ where: { userId } }),
      this.resumeRepo.findOne({ where: { userId, isMaster: true } }),
    ]);
    const jobs = [...candidateJobs, ...publicJobs];
    const resumeText = resume?.extractedText || '';
    return jobs.map((job) => ({
      ...job,
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
    })).sort((a, b) => (b.resumeMatch.score ?? -1) - (a.resumeMatch.score ?? -1));
  }

  async getJobById(id: string, userId: string) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (job?.candidateOwnerId && job.candidateOwnerId !== userId) return null;
    return job;
  }
}
