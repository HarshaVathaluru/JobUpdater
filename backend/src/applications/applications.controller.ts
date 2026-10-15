import { Controller, Post, Param, Get, UseGuards, Body, NotFoundException } from '@nestjs/common';
import { DynamicAgentService } from './dynamic-agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationEntity } from './entities/application.entity';
import { ApplicationEventEntity } from './entities/application-event.entity';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationStatus } from './enums/application-status.enum';
import { JobEntity } from '../jobs/entities/job.entity';
import { ApplicationDocumentEntity } from './entities/application-document.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { ResumeVersionEntity } from '../resume/entities/resume-version.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';

import { SubmissionService } from './submission.service';

function isJobicySourceListing(job: JobEntity): boolean {
  if (job.source?.toLowerCase() !== 'jobicy') return false;
  try {
    const hostname = new URL(job.applicationUrl || '').hostname.toLowerCase();
    return hostname === 'jobicy.com' || hostname.endsWith('.jobicy.com');
  } catch {
    return false;
  }
}

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(
    private readonly agentService: DynamicAgentService,
    private readonly submissionService: SubmissionService,
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(ApplicationEventEntity)
    private readonly eventRepo: Repository<ApplicationEventEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(ApplicationDocumentEntity)
    private readonly documentRepo: Repository<ApplicationDocumentEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
    @InjectRepository(ResumeVersionEntity)
    private readonly resumeVersionRepo: Repository<ResumeVersionEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
  ) {}

  @Get()
  async getMyApplications(@CurrentUser() user: UserEntity) {
    const apps = await this.appRepo.find({ where: { candidateId: user.id }, order: { createdAt: 'DESC' } });
    const [profile, masterResume] = await Promise.all([
      this.profileRepo.findOne({ where: { userId: user.id } }),
      this.resumeRepo.findOne({ where: { userId: user.id, isMaster: true } }),
    ]);
    const appsWithJobs = await Promise.all(
      apps.map(async (app) => {
        const [job, documents, resumeVersion] = await Promise.all([
          this.jobRepo.findOne({ where: { id: app.jobId } }),
          this.documentRepo.find({ where: { applicationId: app.id }, order: { createdAt: 'DESC' } }),
          masterResume ? this.resumeVersionRepo.findOne({ where: { resumeId: masterResume.id, jobId: app.jobId, versionType: 'TAILORED' }, order: { createdAt: 'DESC' } }) : Promise.resolve(null),
        ]);
        return {
          ...app,
          candidate: profile ? { fullName: profile.fullName, email: profile.email, phone: profile.phone, location: profile.location } : null,
          masterResume: masterResume ? { originalFilename: masterResume.originalFilename, mimeType: masterResume.mimeType } : null,
          coverLetter: documents.find((document) => document.documentType === 'COVER_LETTER')?.content
            ? { content: documents.find((document) => document.documentType === 'COVER_LETTER')?.content }
            : null,
          resumeCopy: resumeVersion ? { content: resumeVersion.content, metadata: resumeVersion.metadata } : null,
          job: job ? {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            applicationUrl: job.applicationUrl,
            source: job.source,
            applicationMethod: isJobicySourceListing(job)
              ? 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION'
              : job.applicationMethod,
            description: job.description,
            workMode: job.workMode,
            employmentType: job.employmentType,
          } : null,
        };
      }),
    );
    return { data: appsWithJobs };
  }

  @Get(':applicationId/events')
  async getApplicationEvents(@Param('applicationId') applicationId: string, @CurrentUser() user: UserEntity) {
    const app = await this.appRepo.findOne({ where: { id: applicationId, candidateId: user.id } });
    if (!app) return { data: [], message: 'Application not found' };

    const events = await this.eventRepo.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
    return { data: events };
  }

  @Post(':jobId/start')
  async startApplication(@Param('jobId') jobId: string, @CurrentUser() user: UserEntity) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || (job.candidateOwnerId && job.candidateOwnerId !== user.id)) {
      throw new NotFoundException('Job not found.');
    }
    let app = await this.appRepo.findOne({ where: { jobId, candidateId: user.id } });
    if (!app) {
      app = this.appRepo.create({
        id: uuidv4(),
        jobId,
        candidateId: user.id,
        status: ApplicationStatus.DISCOVERED,
      });
      app = await this.appRepo.save(app);
    }
    return { data: app, message: 'Application created/found.' };
  }

  @Post(':applicationId/agent')
  async runDynamicAgent(@Param('applicationId') applicationId: string, @CurrentUser() user: UserEntity) {
    const app = await this.appRepo.findOne({ where: { id: applicationId, candidateId: user.id } });
    if (!app) return { message: 'Application not found' };

    const result = await this.agentService.runApplicationAgent(applicationId);
    return { data: result, message: result.message };
  }

  @Post('auto-apply')
  async autoApplyMatchingJobs(
    @CurrentUser() user: UserEntity,
    @Body() body: { minScore?: number; limit?: number },
  ) {
    const result = await this.submissionService.autoApplyMatchingJobs(user.id, {
      minScore: body?.minScore,
      limit: body?.limit,
    });
    return { data: result, message: result.message };
  }

  @Post(':applicationId/confirm-registered')
  async confirmRegistered(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const result = await this.submissionService.confirmRegisteredAndApply(applicationId, user.id);
    return { data: result, message: result.message };
  }

  @Post(':applicationId/submit')
  async submitApplication(@Param('applicationId') applicationId: string, @CurrentUser() user: UserEntity) {
    const app = await this.appRepo.findOne({ where: { id: applicationId, candidateId: user.id } });
    if (!app) return { message: 'Application not found' };

    const result = await this.submissionService.submitApplication(applicationId);
    return { data: result, message: result.message };
  }

  @Post(':applicationId/verify')
  async verifySubmission(@Param('applicationId') applicationId: string, @CurrentUser() user: UserEntity) {
    const result = await this.submissionService.verifySubmission(applicationId, user.id);
    return { data: result, message: result.message };
  }

  @Post(':applicationId/authorize-retry')
  async authorizeSubmissionRetry(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: UserEntity,
    @Body() body: { confirmedNotSubmitted?: boolean },
  ) {
    const application = await this.appRepo.findOne({ where: { id: applicationId, candidateId: user.id } });
    if (!application) return { data: { status: false }, message: 'Application not found.' };
    if (body?.confirmedNotSubmitted !== true) {
      return { data: { status: false }, message: 'Confirm that you checked the employer portal and found no submitted application.' };
    }
    if (application.status !== ApplicationStatus.REVIEW_REQUIRED || application.metadata?.submissionAttempted !== true) {
      return { data: { status: false }, message: 'This application is not awaiting a retry review.' };
    }

    application.metadata = {
      ...(application.metadata || {}),
      submissionAttempted: false,
      retryAuthorizedAt: new Date().toISOString(),
    };
    application.failureReason = '';
    await this.appRepo.save(application);
    await this.eventRepo.save(this.eventRepo.create({
      id: uuidv4(),
      applicationId,
      eventType: 'CANDIDATE_AUTHORIZED_RETRY',
      description: 'Candidate confirmed checking the employer portal and authorized a new submission attempt.',
      metadata: { retryAuthorizedAt: application.metadata.retryAuthorizedAt },
    }));
    return { data: { status: true }, message: 'Retry authorized after your portal review.' };
  }

  @Post(':applicationId/mark-manual-submitted')
  async markManualSubmission(@Param('applicationId') applicationId: string, @CurrentUser() user: UserEntity, @Body() body: { confirmationId?: string }) {
    const application = await this.appRepo.findOne({ where: { id: applicationId, candidateId: user.id } });
    if (!application) return { data: { status: false }, message: 'Application not found.' };
    if ([ApplicationStatus.SUBMITTED, ApplicationStatus.VERIFIED].includes(application.status)) {
      return { data: { status: false }, message: 'This application is already marked submitted.' };
    }

    application.status = ApplicationStatus.SUBMITTED;
    application.submittedAt = new Date();
    application.confirmationId = body?.confirmationId?.trim() || '';
    application.failureReason = '';
    application.metadata = { ...(application.metadata || {}), submissionMethod: 'candidate_confirmed_manual', portalConfirmed: false };
    await this.appRepo.save(application);
    await this.eventRepo.save(this.eventRepo.create({
      id: uuidv4(), applicationId, eventType: 'CANDIDATE_MARKED_MANUAL_SUBMISSION',
      description: 'Candidate confirmed that they submitted this application manually on the employer site.',
      metadata: { confirmationId: application.confirmationId || undefined },
    }));
    return { data: { status: true, manuallyConfirmed: true }, message: 'Marked as submitted based on your confirmation. The employer did not send a portal receipt to this app.' };
  }
}
