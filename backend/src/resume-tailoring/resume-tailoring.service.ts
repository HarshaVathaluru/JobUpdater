import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { ResumeVersionEntity } from '../resume/entities/resume-version.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { v4 as uuidv4 } from 'uuid';
import { scoreResumeAgainstJob } from '../matching/resume-match';

@Injectable()
export class ResumeTailoringService {
  constructor(
    @InjectRepository(ResumeEntity) private readonly resumeRepo: Repository<ResumeEntity>,
    @InjectRepository(ResumeVersionEntity) private readonly versionRepo: Repository<ResumeVersionEntity>,
    @InjectRepository(JobEntity) private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CandidateProfileEntity) private readonly profileRepo: Repository<CandidateProfileEntity>,
  ) {}

  async tailorResume(candidateId: string, jobId: string): Promise<ResumeVersionEntity> {
    const [masterResume, job, profile] = await Promise.all([
      this.resumeRepo.findOne({ where: { userId: candidateId, isMaster: true } }),
      this.jobRepo.findOne({ where: { id: jobId } }),
      this.profileRepo.findOne({ where: { userId: candidateId } }),
    ]);
    if (!masterResume) throw new Error('Master resume not found for candidate');
    if (!job || (job.candidateOwnerId && job.candidateOwnerId !== candidateId)) throw new NotFoundException('Job not found.');

    // Preserve the candidate's source text verbatim. Do not generate employment, skills,
    // education, achievements, or a claimed ATS improvement.
    const content = `# Resume for ${job.title} at ${job.company}\n\n${masterResume.extractedText || ''}`;
    const match = scoreResumeAgainstJob(job, profile, masterResume.extractedText || '');
    const version = this.versionRepo.create({
      id: uuidv4(),
      resumeId: masterResume.id,
      jobId: job.id,
      versionType: 'TAILORED',
      content,
      metadata: {
        jobTitle: job.title,
        company: job.company,
        scoreType: 'resume_keyword_coverage_estimate',
        score: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        tailoringHighlights: ['Original resume text preserved without adding unverified claims.'],
      },
    });
    return this.versionRepo.save(version);
  }

  async getTailoredVersions(candidateId: string) {
    const masterResume = await this.resumeRepo.findOne({ where: { userId: candidateId, isMaster: true } });
    if (!masterResume) return [];
    const versions = await this.versionRepo.find({ where: { resumeId: masterResume.id, versionType: 'TAILORED' } });
    return versions.filter((version) => version.metadata?.scoreType === 'resume_keyword_coverage_estimate');
  }

  async getTailoredResumeForJob(candidateId: string, jobId: string) {
    const masterResume = await this.resumeRepo.findOne({ where: { userId: candidateId, isMaster: true } });
    if (!masterResume) return null;
    const version = await this.versionRepo.findOne({
      where: { resumeId: masterResume.id, jobId, versionType: 'TAILORED' },
      order: { createdAt: 'DESC' },
    });
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (job?.candidateOwnerId && job.candidateOwnerId !== candidateId) return null;
    return version?.metadata?.scoreType === 'resume_keyword_coverage_estimate' ? version : null;
  }
}
