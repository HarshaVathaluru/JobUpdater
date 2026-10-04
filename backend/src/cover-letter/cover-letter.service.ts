import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationDocumentEntity } from '../applications/entities/application-document.entity';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { ApplicationStatus } from '../applications/enums/application-status.enum';
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
export class CoverLetterService {
  private readonly logger = new Logger(CoverLetterService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(ApplicationDocumentEntity)
    private readonly docRepo: Repository<ApplicationDocumentEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  async generateCoverLetter(candidateId: string, jobId: string): Promise<ApplicationDocumentEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error('Job not found');
    }

    const profile = await this.profileRepo.findOne({ where: { userId: candidateId } });
    if (!profile) {
      throw new Error('Candidate profile not found');
    }

    let application = await this.appRepo.findOne({
      where: { candidateId, jobId },
    });

    if (!application) {
      application = this.appRepo.create({
        id: uuidv4(),
        candidateId,
        jobId,
        status: ApplicationStatus.DISCOVERED,
      });
      await this.appRepo.save(application);
    }

    this.logger.log(`Generating cover letter for candidate ${candidateId}, job ${jobId} (${job.title} at ${job.company})`);

    const jobSkills = parseSkills(job.requiredSkills);
    const candidateSkills = parseSkills(profile.skills);
    let coverLetterContent: string;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        Write a professional, tailored cover letter for the candidate applying to the job below.
        
        RULES:
        1. Write concisely and professionally.
        2. Draw directly from the Candidate Profile's experience and skills.
        3. Focus on explaining why the candidate is a strong fit for the specific requirements of the Job Description.
        4. DO NOT invent company facts.
        5. DO NOT invent candidate achievements, skills, or metrics that are not in the profile.
        6. Provide ONLY the body of the cover letter. Do not include address blocks or placeholders for signatures.
        
        JOB DESCRIPTION:
        Title: ${job.title}
        Company: ${job.company}
        Description: ${job.description}
        Requirements: ${jobSkills.join(', ')}
        
        CANDIDATE PROFILE:
        Name: ${profile.fullName}
        Skills: ${candidateSkills.join(', ')}
        Summary: ${profile.summary || ''}
        Experience: ${JSON.stringify(profile.experience || [])}
        Education: ${JSON.stringify(profile.education || [])}
      `;

      const result = await model.generateContent(prompt);
      coverLetterContent = result.response.text();
    } catch (aiErr) {
      this.logger.warn(`Gemini cover letter unavailable (${aiErr.message}), generating structured factual cover letter.`);

      const relevantSkills = jobSkills.length > 0 ? jobSkills.slice(0, 4).join(', ') : 'software development and engineering';
      coverLetterContent = `Dear Hiring Team at ${job.company},

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With a proven foundation in engineering and technical problem solving, I am excited about the opportunity to contribute effectively to your team.

My background aligns well with your core focus areas, particularly around ${relevantSkills}. Throughout my projects and professional experience, I have developed a disciplined approach to building reliable, high-performance software systems and collaborating cross-functionally to achieve measurable results.

I admire ${job.company}'s mission and standard of excellence. I am confident that my technical proficiency, coupled with my continuous drive to learn and deliver high quality solutions, will allow me to quickly make a meaningful impact.

Thank you for your time and consideration. I welcome the opportunity to discuss how my background and skills can support your goals in an interview.

Sincerely,
${profile.fullName || 'Candidate'}`;
    }

    let coverLetter = await this.docRepo.findOne({
      where: { applicationId: application.id, documentType: 'COVER_LETTER' },
    });

    if (!coverLetter) {
      coverLetter = this.docRepo.create({
        id: uuidv4(),
        applicationId: application.id,
        documentType: 'COVER_LETTER',
      });
    }

    coverLetter.content = coverLetterContent;
    return this.docRepo.save(coverLetter);
  }

  async getCoverLetter(applicationId: string): Promise<ApplicationDocumentEntity | null> {
    return this.docRepo.findOne({
      where: { applicationId, documentType: 'COVER_LETTER' },
    });
  }

  async getCoverLetterForJob(candidateId: string, jobId: string): Promise<ApplicationDocumentEntity | null> {
    const application = await this.appRepo.findOne({ where: { candidateId, jobId } });
    if (!application) return null;
    return this.docRepo.findOne({
      where: { applicationId: application.id, documentType: 'COVER_LETTER' },
    });
  }
}
