import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ApplicationDocumentEntity } from '../applications/entities/application-document.entity';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { ApplicationStatus } from '../applications/enums/application-status.enum';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { v4 as uuidv4 } from 'uuid';
import { parseSkillList } from '../matching/resume-match';

@Injectable()
export class CoverLetterService {
  constructor(
    @InjectRepository(ApplicationDocumentEntity) private readonly docRepo: Repository<ApplicationDocumentEntity>,
    @InjectRepository(ApplicationEntity) private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(JobEntity) private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CandidateProfileEntity) private readonly profileRepo: Repository<CandidateProfileEntity>,
  ) {}

  async generateCoverLetter(candidateId: string, jobId: string): Promise<ApplicationDocumentEntity> {
    const [job, profile] = await Promise.all([
      this.jobRepo.findOne({ where: { id: jobId } }),
      this.profileRepo.findOne({ where: { userId: candidateId } }),
    ]);
    if (!job || (job.candidateOwnerId && job.candidateOwnerId !== candidateId)) throw new NotFoundException('Job not found.');
    if (!profile) throw new Error('Candidate profile not found. Upload a resume or complete your profile first.');

    let application = await this.appRepo.findOne({ where: { candidateId, jobId } });
    if (!application) {
      application = await this.appRepo.save(this.appRepo.create({
        id: uuidv4(), candidateId, jobId, status: ApplicationStatus.DISCOVERED,
      }));
    }

    const jobSkills = parseSkillList(job.requiredSkills);
    const candidateSkills = parseSkillList(profile.skills);
    const matchingSkills = candidateSkills.filter((skill) =>
      jobSkills.some((required) => required.toLowerCase() === skill.toLowerCase()),
    );
    const experience = (profile.experience || [])
      .map((item: any) => [item.title, item.company, item.description].filter(Boolean).join(' — '))
      .filter(Boolean);
    const paragraphs = [
      `Dear Hiring Team at ${job.company},`,
      `I am applying for the ${job.title} position${job.location ? ` in ${job.location}` : ''}.`,
      profile.summary?.trim() || '',
      matchingSkills.length ? `Skills from my profile that also appear in the listed requirements: ${matchingSkills.join(', ')}.` : '',
      experience.length ? `Relevant experience listed in my profile:\n${experience.map((item) => `• ${item}`).join('\n')}` : '',
      'I would welcome the opportunity to discuss my background and the role. Thank you for your consideration.',
      profile.fullName ? `Sincerely,\n${profile.fullName}` : 'Sincerely,',
    ].filter(Boolean);
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
    // Replace legacy generated drafts that may contain hard-coded sample-candidate details.
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
