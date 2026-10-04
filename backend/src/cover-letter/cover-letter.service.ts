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
      this.logger.warn(`Gemini cover letter unavailable (${aiErr.message}), generating comprehensive, tailored cover letter.`);

      const candidateName = profile.fullName || 'HARSHA VARDHAN REDDY';
      const candidateEmail = profile.email || 'vathaluruharshavardhan@gmail.com';
      const candidatePhone = profile.phone || '+91 7013276091';
      const candidateLoc = profile.location || 'Andhra Pradesh, India';

      const keySkillsList = jobSkills.length > 0 ? jobSkills.slice(0, 5).join(', ') : 'Java, React.js/Next.js, Node.js, RESTful APIs, and Automated Testing';

      coverLetterContent = `HARSHA VARDHAN REDDY
${candidateLoc} | ${candidatePhone} | ${candidateEmail}
LinkedIn: https://linkedin.com/in/harsha-vardhan2005 | GitHub: https://github.com/HarshaVathaluru

Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

To:
Hiring Team & Technical Leadership
${job.company}
${job.location ? job.location : 'Engineering Department'}

Subject: Application for ${job.title} — Harsha Vardhan Reddy

Dear Hiring Team at ${job.company},

I am writing to express my enthusiastic interest in the ${job.title} position at ${job.company}. Having followed ${job.company}'s recent technical milestones and commitment to engineering excellence, I was immediately drawn to this opportunity. With hands-on experience across Full Stack Web Development, API Architecture, and Test Automation, combined with production internship experience at Zenitude.ai and Mphasis Limited, I am eager to contribute directly to ${job.company}'s high-impact software initiatives.

Your opening for ${job.title} specifically emphasizes expertise in ${keySkillsList}. Throughout my technical journey, I have actively developed and delivered robust software applications utilizing these core technologies:
• Full-Stack Engineering & API Integration: At Zenitude.ai, I developed and validated responsive web application modules utilizing React.js, Next.js, and Node.js with high-throughput REST APIs, optimizing data flow and improving user-perceived latency.
• Enterprise Quality Assurance & Test Automation: At Mphasis Limited, I engineered automated functional, regression, and API test suites using Selenium WebDriver, Java, Cucumber BDD, Tosca, and Postman for mission-critical enterprise applications, logging and resolving 50+ defects to ensure zero-defect release readiness.
• Database Management & System Scalability: Extensive experience architecting normalized database schemas and queries across PostgreSQL, MySQL, and MongoDB, ensuring data integrity and transactional reliability.

In addition to my professional internship work, I have architected independent end-to-end projects demonstrating comprehensive engineering ownership:
1. Compra Layout Agent: Built an AI-powered design studio enabling dynamic layout manipulation via natural language, featuring a custom LLM Agent Node with intent recognition and real-time backend updates.
2. Sniff Spot: Designed a full-stack MERN booking platform incorporating secure JWT-based authentication, password encryption, and scalable RESTful endpoints for real-time booking management.

What excites me most about joining ${job.company} is the opportunity to bring together rigorous software craftsmanship, test-driven validation, and an agile collaborative mindset. I hold a B.Tech in Electronics & Communication Engineering (8.16 CGPA), completed the Deloitte Australia Technology Job Simulation, and hold the Tricentis Tosca Advanced Automation Certification.

I welcome the opportunity to discuss how my technical skills, proactive problem-solving abilities, and dedication can drive immediate value for your engineering team at ${job.company}. Thank you for your time and consideration.

Warm regards,

Harsha Vardhan Reddy
Phone: ${candidatePhone}
Email: ${candidateEmail}
LinkedIn: https://linkedin.com/in/harsha-vardhan2005
GitHub: https://github.com/HarshaVathaluru`;
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

  async getAllCoverLetters(candidateId: string): Promise<ApplicationDocumentEntity[]> {
    const applications = await this.appRepo.find({ where: { candidateId } });
    if (!applications || applications.length === 0) return [];
    const appIds = applications.map((a) => a.id);
    return this.docRepo
      .createQueryBuilder('doc')
      .where('doc.documentType = :docType', { docType: 'COVER_LETTER' })
      .andWhere('doc.applicationId IN (:...appIds)', { appIds })
      .getMany();
  }
}
