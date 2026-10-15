import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JobMatchEntity } from './entities/job-match.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { scoreResumeAgainstJob } from './resume-match';

const parseSkills = (skills: any): string[] => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === 'string') return skills.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  return [];
};

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(JobMatchEntity)
    private readonly matchRepo: Repository<JobMatchEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  async calculateMatch(jobId: string, candidateId: string): Promise<JobMatchEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    const profile = await this.profileRepo.findOne({ where: { userId: candidateId } });

    if (!job || (job.candidateOwnerId && job.candidateOwnerId !== candidateId) || !profile) {
      throw new NotFoundException('Job or candidate profile not found.');
    }

    this.logger.log(`Calculating resume keyword coverage for ${job.id} (${job.title} at ${job.company}) and candidate ${candidateId}`);
    let resume = await this.resumeRepo.findOne({ where: { userId: candidateId, isMaster: true } });
    if (!resume) {
      resume = await this.resumeRepo.findOne({ where: { userId: candidateId }, order: { createdAt: 'DESC' } });
    }
    const data = scoreResumeAgainstJob(job, profile, resume?.extractedText || '');
    const overallScore = data.score ?? 0;
    const recommendation = data.score === null ? 'REVIEW' : overallScore >= 75 ? 'APPLY' : overallScore >= 50 ? 'REVIEW' : 'SKIP';

    let match = await this.matchRepo.findOne({ where: { jobId, candidateId } });
    if (!match) {
      match = this.matchRepo.create({ id: uuidv4(), jobId, candidateId });
    }

    match.overallScore = overallScore;
    match.keywordScore = data.score ?? 0;
    match.skillsScore = data.score ?? 0;
    match.experienceScore = 0;
    match.educationScore = 0;
    match.matchedSkills = data.matchedSkills;
    match.missingSkills = data.missingSkills;
    match.hardRequirementsMet = {};
    match.recommendation = recommendation;
    match.analysis = { explanation: data.explanation, evidenceSource: data.evidenceSource, titleMatches: data.titleMatches };

    return this.matchRepo.save(match);
  }

  async getMatchesForCandidate(candidateId: string) {
    return this.matchRepo.find({ where: { candidateId }, order: { overallScore: 'DESC' } });
  }
}
