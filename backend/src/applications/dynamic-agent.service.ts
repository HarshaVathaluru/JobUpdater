import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationEntity } from './entities/application.entity';
import { ApplicationStatus } from './enums/application-status.enum';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { CandidatePreferenceEntity } from '../candidate/entities/candidate-preference.entity';
import { ApplicationEventEntity } from './entities/application-event.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { ApplicationDocumentEntity } from './entities/application-document.entity';
import { BrowserService } from '../browser/browser.service';

@Injectable()
export class DynamicAgentService {
  constructor(
    @InjectRepository(ApplicationEntity) private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(CandidateProfileEntity) private readonly profileRepo: Repository<CandidateProfileEntity>,
    @InjectRepository(CandidatePreferenceEntity) private readonly prefRepo: Repository<CandidatePreferenceEntity>,
    @InjectRepository(ApplicationEventEntity) private readonly eventRepo: Repository<ApplicationEventEntity>,
    @InjectRepository(JobEntity) private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(ResumeEntity) private readonly resumeRepo: Repository<ResumeEntity>,
    @InjectRepository(ApplicationDocumentEntity) private readonly documentRepo: Repository<ApplicationDocumentEntity>,
    private readonly browserService: BrowserService,
  ) {}

  async runApplicationAgent(applicationId: string) {
    const application = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new Error('Application not found');
    const [job, profile, pref, resume, coverLetter] = await Promise.all([
      this.jobRepo.findOne({ where: { id: application.jobId } }),
      this.profileRepo.findOne({ where: { userId: application.candidateId } }),
      this.prefRepo.findOne({ where: { userId: application.candidateId } }),
      this.resumeRepo.findOne({ where: { userId: application.candidateId, isMaster: true } }),
      this.documentRepo.findOne({ where: { applicationId, documentType: 'COVER_LETTER' } }),
    ]);
    if (!job || !profile) throw new Error('Job or candidate profile is missing.');
    if (!job.applicationUrl || !/^https?:\/\//i.test(job.applicationUrl)) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      application.failureReason = 'This job has no valid application URL to inspect.';
      await this.appRepo.save(application);
      return { message: application.failureReason, browserInspection: null };
    }

    const targetHost = new URL(job.applicationUrl).hostname.toLowerCase();
    if ((targetHost === 'jobicy.com' || targetHost.endsWith('.jobicy.com')) && job.source?.toLowerCase() === 'jobicy') {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      application.failureReason = 'This URL opens the Jobicy listing/profile site, not the employer application. Open the listing and click the employer Apply link; then use the direct employer URL for portal inspection.';
      application.metadata = { ...(application.metadata || {}), sourceListingRequiresManual: true };
      await this.appRepo.save(application);
      await this.eventRepo.save(this.eventRepo.create({
        id: uuidv4(),
        applicationId,
        eventType: 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION',
        description: application.failureReason,
        metadata: { sourceUrl: job.applicationUrl },
      }));
      return { message: application.failureReason, browserInspection: null };
    }

    const candidatePassword = profile.portalPassword || pref?.portalPassword || undefined;
    const targetUrl = job.applicationUrl;

    const result = await this.browserService.inspectAndFillPortal(targetUrl, {
      candidateId: application.candidateId,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      password: candidatePassword,
      portalAccounts: (pref?.portalAccounts || profile.portalAccounts) || undefined,
      resumeFilePath: resume?.storagePath,
      coverLetter: coverLetter?.content || undefined,
    }, false);

    for (const step of result.steps) {
      await this.eventRepo.save(this.eventRepo.create({
        id: uuidv4(), applicationId, eventType: step.step, description: step.detail, metadata: { timestamp: step.timestamp },
      }));
    }

    // If an external employer URL was resolved from a listing page (like LinkedIn or Shine)
    const resolvedUrl = result.finalUrl || targetUrl;
    const isExternalResolved = resolvedUrl && resolvedUrl !== targetUrl && !resolvedUrl.includes('linkedin.com/jobs') && !resolvedUrl.includes('shine.com/job');

    const needsReview = result.hasCaptcha || result.requiresUserAction || result.filledFields.length === 0;
    application.status = needsReview ? ApplicationStatus.REVIEW_REQUIRED : ApplicationStatus.FORM_FILLING;
    application.failureReason = needsReview ? result.userActionReason || 'Review the employer form manually before submitting.' : '';
    application.metadata = {
      ...(application.metadata || {}),
      resolvedEmployerUrl: isExternalResolved ? resolvedUrl : application.metadata?.resolvedEmployerUrl,
      siteRegistered: !result.requiresUserAction || application.metadata?.siteRegistered,
      portalInspection: {
        pageTitle: result.pageTitle,
        finalUrl: resolvedUrl,
        detectedFields: result.detectedFields.map(({ name, type }) => ({ name, type })),
        filledFields: result.filledFields.map(({ field }) => field),
        hasCaptcha: result.hasCaptcha,
        requiresUserAction: result.requiresUserAction,
        userActionReason: result.userActionReason,
      },
      lastAgentRun: new Date().toISOString(),
    };
    await this.appRepo.save(application);

    return {
      status: !needsReview,
      requiresUserAction: result.requiresUserAction,
      portalUrl: resolvedUrl,
      message: needsReview
        ? result.userActionReason || 'The page was inspected. Review and complete it on the employer site.'
        : 'The page was inspected and matching profile fields were filled. Review every field and submit on the employer site.',
      browserInspection: application.metadata.portalInspection,
    };
  }
}
