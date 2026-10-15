import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationDocumentEntity } from '../applications/entities/application-document.entity';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { ApplicationStatus } from '../applications/enums/application-status.enum';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { v4 as uuidv4 } from 'uuid';
import { scoreResumeAgainstJob } from '../matching/resume-match';

@Injectable()
export class CoverLetterService {
  constructor(
    @InjectRepository(ApplicationDocumentEntity) private readonly docRepo: Repository<ApplicationDocumentEntity>,
    @InjectRepository(ApplicationEntity) private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(JobEntity) private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CandidateProfileEntity) private readonly profileRepo: Repository<CandidateProfileEntity>,
    @InjectRepository(ResumeEntity) private readonly resumeRepo: Repository<ResumeEntity>,
  ) {}

  async generateCoverLetter(candidateId: string, jobId: string): Promise<ApplicationDocumentEntity> {
    const [job, profile] = await Promise.all([
      this.jobRepo.findOne({ where: { id: jobId } }),
      this.profileRepo.findOne({ where: { userId: candidateId } }),
    ]);
    if (!job || (job.candidateOwnerId && job.candidateOwnerId !== candidateId)) throw new NotFoundException('Job not found.');
    if (!profile) throw new Error('Candidate profile not found. Upload a resume or complete your profile first.');

    let masterResume = await this.resumeRepo.findOne({ where: { userId: candidateId, isMaster: true } });
    if (!masterResume) {
      masterResume = await this.resumeRepo.findOne({ where: { userId: candidateId }, order: { createdAt: 'DESC' } });
    }

    let application = await this.appRepo.findOne({ where: { candidateId, jobId } });
    if (!application) {
      application = await this.appRepo.save(this.appRepo.create({
        id: uuidv4(), candidateId, jobId, status: ApplicationStatus.DISCOVERED,
      }));
    }

    const match = scoreResumeAgainstJob(job, profile, masterResume?.extractedText || '');
    const matchedSkills = match.matchedSkills.length > 0
      ? match.matchedSkills
      : ['Java', 'React.js', 'Node.js', 'REST APIs', 'PostgreSQL'];

    const fullName = (profile?.fullName || '').trim() || 'Candidate';
    const email = (profile?.email || '').trim();
    const phone = (profile?.phone || '').trim();
    const location = (profile?.location || '').trim();

    const candidateSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
    const skillsToHighlight = matchedSkills.length > 0 ? matchedSkills : candidateSkills.slice(0, 5);
    const matchedSkillsStr = skillsToHighlight.join(', ') || 'software development and modern engineering';

    // Extract dynamic experience summary from candidate profile
    const experiences = Array.isArray(profile?.experience) ? profile.experience : [];
    let experienceNarrative = '';
    if (experiences.length > 0) {
      const topExp = experiences.slice(0, 2);
      const expDescriptions = topExp.map((e: any) => {
        const title = e.title || e.role || 'Software Engineer';
        const company = e.company || 'the organization';
        const desc = (e.description || '').split('.')[0] || 'engineering robust features and ensuring high software quality';
        return `As ${title} at ${company}, I focused on ${desc}`;
      });
      experienceNarrative = expDescriptions.join('. Additionally, ') + '.';
    }

    // Extract dynamic project summary from candidate profile
    const projects = Array.isArray(profile?.projects) ? profile.projects : [];
    let projectNarrative = '';
    if (projects.length > 0) {
      const topProjects = projects.slice(0, 2);
      const projDescriptions = topProjects.map((p: any) => {
        const name = p.name || p.title || 'engineering project';
        const tech = Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || '');
        const desc = (p.description || '').split('.')[0] || 'full-lifecycle implementation and architecture';
        return `${name}${tech ? ` (${tech})` : ''}, delivering ${desc}`;
      });
      projectNarrative = `Through projects such as ${projDescriptions.join(' and ')}, I have repeatedly demonstrated my ability to solve challenging problems and deliver production-grade results.`;
    }

    const paragraphs = [
      `Dear Hiring Team at ${job.company},`,

      `I am writing to express my strong enthusiasm and interest in the ${job.title} position${job.location ? ` in ${job.location}` : ''} at ${job.company}. With a solid foundation in software development, test-driven validation, and building reliable architectures, I am eager to contribute immediately to ${job.company}'s engineering initiatives.`,

      `Reviewing the requirements for ${job.title}, I was excited to see the direct alignment with my technical competencies. My hands-on toolkit includes ${matchedSkillsStr}, spanning modern front-end engineering, robust back-end services, and end-to-end quality validation across the SDLC.`,
    ];

    if (experienceNarrative) {
      paragraphs.push(experienceNarrative);
    }
    if (projectNarrative) {
      paragraphs.push(projectNarrative);
    }

    paragraphs.push(
      `${job.company}'s focus on innovation and technical excellence makes this opportunity particularly exciting. I am confident that my experience in ${skillsToHighlight.slice(0, 3).join(', ') || 'modern software engineering'}, coupled with my proactive problem-solving mindset and dedication to clean, maintainable code, will bring distinct value to your team.`,
      `I would welcome the opportunity to discuss my background and how my experiences align with your team's goals. Thank you very much for your time and consideration.`,
      `Sincerely,\n${fullName}\n${[location, phone, email].filter(Boolean).join('\n')}`,
    );

    const content = paragraphs.join('\n\n');

    let coverLetter = await this.docRepo.findOne({ where: { applicationId: application.id, documentType: 'COVER_LETTER' } });
    if (!coverLetter) {
      coverLetter = this.docRepo.create({ id: uuidv4(), applicationId: application.id, documentType: 'COVER_LETTER' });
    }
    coverLetter.content = content;
    return this.docRepo.save(coverLetter);
  }

  async getCoverLetter(applicationId: string): Promise<ApplicationDocumentEntity | null> {
    return this.docRepo.findOne({ where: { applicationId, documentType: 'COVER_LETTER' } });
  }

  async getCoverLetterForJob(candidateId: string, jobId: string): Promise<ApplicationDocumentEntity | null> {
    const application = await this.appRepo.findOne({ where: { candidateId, jobId } });
    if (!application) return null;
    return this.generateCoverLetter(candidateId, jobId);
  }

  async getAllCoverLetters(candidateId: string): Promise<ApplicationDocumentEntity[]> {
    const applications = await this.appRepo.find({ where: { candidateId } });
    if (!applications.length) return [];
    return this.docRepo.createQueryBuilder('doc')
      .where('doc.documentType = :docType', { docType: 'COVER_LETTER' })
      .andWhere('doc.applicationId IN (:...appIds)', { appIds: applications.map((application) => application.id) })
      .getMany();
  }
}
