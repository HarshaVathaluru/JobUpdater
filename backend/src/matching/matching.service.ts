import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobMatchEntity } from './entities/job-match.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

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
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  async calculateMatch(jobId: string, candidateId: string): Promise<JobMatchEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    const profile = await this.profileRepo.findOne({ where: { userId: candidateId } });

    if (!job || !profile) {
      throw new Error('Job or Profile not found');
    }

    this.logger.log(`Calculating ATS match for job ${job.id} (${job.title} at ${job.company}) and candidate ${candidateId}`);

    const jobSkills = parseSkills(job.requiredSkills);
    const candidateSkills = parseSkills(profile.skills);
    const candidateSkillsLower = new Set(candidateSkills.map(s => s.toLowerCase()));

    // Build comprehensive candidate corpus
    const experiencesText = (profile.experience || []).map((e: any) => `${e.title || ''} ${e.company || ''} ${e.description || ''}`).join(' ');
    const fullCandidateText = `${profile.fullName || ''} ${profile.summary || ''} ${candidateSkills.join(' ')} ${experiencesText}`.toLowerCase();

    let data: any = null;

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash', 
        generationConfig: { responseMimeType: 'application/json' } 
      });

      const prompt = `
        You are an objective ATS compatibility analyzer. Analyze the job description against the candidate's profile.
        
        Job Details:
        Title: ${job.title}
        Company: ${job.company}
        Description: ${job.description}
        Required Skills: ${jobSkills.join(', ')}
        
        Candidate Profile:
        Full Name: ${profile.fullName}
        Skills: ${candidateSkills.join(', ')}
        Summary: ${profile.summary || ''}
        Experience: ${JSON.stringify(profile.experience || [])}
        Education: ${JSON.stringify(profile.education || [])}
        
        Perform the following:
        1. Identify matching keywords and skills.
        2. Identify missing keywords and skills (do not fabricate these).
        3. Check hard requirements (education, years of experience).
        4. Compare experience relevance.
        5. Generate an explainable overall compatibility score (0-100).
        6. Determine recommendation: 'APPLY' (>75), 'REVIEW' (50-75), or 'SKIP' (<50).
        
        Output strictly in JSON:
        {
          "overallScore": number,
          "keywordScore": number,
          "skillsScore": number,
          "experienceScore": number,
          "educationScore": number,
          "matchedSkills": [string],
          "missingSkills": [string],
          "hardRequirementsMet": { "education": boolean, "experience": boolean },
          "recommendation": "APPLY" | "REVIEW" | "SKIP",
          "analysis": "Brief string explaining the score"
        }
      `;

      const result = await model.generateContent(prompt);
      data = JSON.parse(result.response.text());
    } catch (aiErr) {
      this.logger.warn(`Gemini ATS matching unavailable (${aiErr.message}), using deterministic ATS scoring.`);

      const matchedSkills: string[] = [];
      const missingSkills: string[] = [];

      jobSkills.forEach(js => {
        const jsLower = js.toLowerCase();
        const found = candidateSkillsLower.has(jsLower) || 
                      fullCandidateText.includes(jsLower) ||
                      jsLower.split(/\s+/).some(word => word.length > 3 && fullCandidateText.includes(word));
        if (found) {
          matchedSkills.push(js);
        } else {
          missingSkills.push(js);
        }
      });

      const skillsScore = jobSkills.length > 0 
        ? Math.round((matchedSkills.length / jobSkills.length) * 100) 
        : 85;

      const titleTokens = job.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchedTokens = titleTokens.filter(t => fullCandidateText.includes(t));
      const keywordScore = titleTokens.length > 0 
        ? Math.round((matchedTokens.length / titleTokens.length) * 100) 
        : 80;

      const educationScore = (profile.education && profile.education.length > 0) ? 95 : 75;
      const experienceScore = (profile.experience && profile.experience.length > 0) ? 90 : 80;

      const overallScore = Math.min(100, Math.max(10, Math.round(
        skillsScore * 0.4 + keywordScore * 0.3 + experienceScore * 0.2 + educationScore * 0.1
      )));

      const recommendation = overallScore >= 75 ? 'APPLY' : (overallScore >= 50 ? 'REVIEW' : 'SKIP');

      data = {
        overallScore,
        keywordScore,
        skillsScore,
        experienceScore,
        educationScore,
        matchedSkills,
        missingSkills,
        hardRequirementsMet: { education: true, experience: true },
        recommendation,
        analysis: `Evaluated ${jobSkills.length} required skill sets against candidate profile with ${matchedSkills.length} matched criteria (${overallScore}% compatibility).`,
      };
    }

    let match = await this.matchRepo.findOne({ where: { jobId, candidateId } });
    if (!match) {
      match = this.matchRepo.create({ id: uuidv4(), jobId, candidateId });
    }

    match.overallScore = data.overallScore || 0;
    match.keywordScore = data.keywordScore || 0;
    match.skillsScore = data.skillsScore || 0;
    match.experienceScore = data.experienceScore || 0;
    match.educationScore = data.educationScore || 0;
    match.matchedSkills = data.matchedSkills || [];
    match.missingSkills = data.missingSkills || [];
    match.hardRequirementsMet = data.hardRequirementsMet || { education: true, experience: true };
    match.recommendation = data.recommendation || 'SKIP';
    match.analysis = { explanation: data.analysis };

    return this.matchRepo.save(match);
  }

  async getMatchesForCandidate(candidateId: string) {
    return this.matchRepo.find({ where: { candidateId }, order: { overallScore: 'DESC' } });
  }
}
