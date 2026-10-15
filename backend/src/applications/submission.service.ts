import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ApplicationEntity } from './entities/application.entity';
import { ApplicationStatus } from './enums/application-status.enum';
import { ApplicationDocumentEntity } from './entities/application-document.entity';
import { ApplicationEventEntity } from './entities/application-event.entity';
import { JobMatchEntity } from '../matching/entities/job-match.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { CandidatePreferenceEntity } from '../candidate/entities/candidate-preference.entity';
import { BrowserService } from '../browser/browser.service';
import { NotificationsService } from '../notifications/notifications.service';
import { scoreResumeAgainstJob } from '../matching/resume-match';

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(ApplicationDocumentEntity)
    private readonly docRepo: Repository<ApplicationDocumentEntity>,
    @InjectRepository(JobMatchEntity)
    private readonly matchRepo: Repository<JobMatchEntity>,
    @InjectRepository(ApplicationEventEntity)
    private readonly eventRepo: Repository<ApplicationEventEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
    @InjectRepository(CandidatePreferenceEntity)
    private readonly prefRepo: Repository<CandidatePreferenceEntity>,
    private readonly browserService: BrowserService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submitApplication(applicationId: string) {
    const application = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status === ApplicationStatus.SUBMITTED || application.status === ApplicationStatus.VERIFIED) {
      return { status: true, message: 'Application is already submitted or verified.' };
    }
    const job = await this.jobRepo.findOne({ where: { id: application.jobId } });
    const profile = await this.profileRepo.findOne({ where: { userId: application.candidateId } });

    if (!job || !profile) {
      throw new Error('Associated job or candidate profile not found.');
    }

    let portalHost = '';
    try { portalHost = new URL(job.applicationUrl || '').hostname.toLowerCase(); } catch { /* handled as missing URL below */ }
    const isJobicyListing = (portalHost === 'jobicy.com' || portalHost.endsWith('.jobicy.com')) &&
      (job.source?.toLowerCase() === 'jobicy' || job.applicationMethod === 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION');
    if (isJobicyListing) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      application.failureReason = 'This is a Jobicy listing page, not the employer application form. Open the listing, click the employer Apply button, and complete the employer form there. Add the direct employer application URL to enable portal assistance.';
      application.metadata = {
        ...(application.metadata || {}),
        submissionAttempted: false,
        portalUrl: job.applicationUrl,
        sourceListingRequiresManual: true,
      };
      await this.appRepo.save(application);
      await this.logEvent(application.id, 'SOURCE_LISTING_REQUIRES_MANUAL_APPLICATION', application.failureReason, { portalUrl: job.applicationUrl });
      return { status: false, requiresUserAction: true, portalUrl: job.applicationUrl, message: application.failureReason };
    }

    if (application.metadata?.submissionAttempted === true && application.status === ApplicationStatus.REVIEW_REQUIRED) {
      return {
        status: false,
        requiresUserAction: true,
        portalUrl: application.metadata.portalUrl,
        message: 'A previous submission attempt was not confirmed. Review the employer portal manually before retrying to avoid a duplicate application.',
      };
    }

    const isLinkedInOrShine = portalHost === 'linkedin.com' || portalHost.endsWith('.linkedin.com') || portalHost === 'shine.com' || portalHost.endsWith('.shine.com');
    const pref = await this.prefRepo.findOne({ where: { userId: application.candidateId } });
    let isSiteRegistered = Boolean(application.metadata?.siteRegistered);
    if (!isSiteRegistered && portalHost) {
      const priorApps = await this.appRepo.find({ where: { candidateId: application.candidateId } });
      isSiteRegistered = priorApps.some((a) => a.metadata?.siteRegistered === true && a.metadata?.registeredHost === portalHost);
    }
    const hasCredentialsOrExistingAccount = Boolean(profile.portalPassword || pref?.portalPassword || application.metadata?.siteRegistered || isSiteRegistered);

    if (isLinkedInOrShine && !hasCredentialsOrExistingAccount) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      application.failureReason = `${portalHost.includes('linkedin') ? 'LinkedIn' : 'Shine'} requires candidate sign-in. If you already have an account, enter your credentials in Preferences or click "I Have An Account" to apply automatically!`;
      application.metadata = {
        ...(application.metadata || {}),
        portalUrl: job.applicationUrl,
        requiresFirstTimeRegistration: true,
        registeredHost: portalHost,
        automatedApplySupported: true,
      };
      await this.appRepo.save(application);
      await this.logEvent(application.id, 'FIRST_TIME_REGISTRATION_REQUIRED', application.failureReason, { portalUrl: job.applicationUrl });
      return {
        status: false,
        requiresUserAction: true,
        requiresFirstTimeRegistration: true,
        portalUrl: job.applicationUrl,
        message: application.failureReason,
      };
    }

    this.logger.log(`Initiating submission for App ID: ${application.id} to "${job.company}"`);
    await this.logEvent(
      application.id,
      'SUBMISSION_INITIATED',
      `Starting submission process for "${job.title}" at "${job.company}"`,
      { portalUrl: job.applicationUrl },
    );

    // Pre-submission verification: Check eligibility
    const match = await this.matchRepo.findOne({
      where: { jobId: application.jobId, candidateId: application.candidateId },
    });
    if (match && match.recommendation === 'SKIP') {
      await this.logEvent(application.id, 'LOW_KEYWORD_COVERAGE_REVIEW', 'Candidate chose to continue despite low resume keyword coverage.', {
        overallScore: match.overallScore,
      });
    }

    // Master resume verification
    let masterResume = await this.resumeRepo.findOne({
      where: { userId: application.candidateId, isMaster: true },
    });

    if (!masterResume) {
      // Check if there is any resume
      masterResume = await this.resumeRepo.findOne({
        where: { userId: application.candidateId },
      });
    }

    if (!masterResume) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      application.failureReason = 'Resume document not found. Please upload a resume before submitting.';
      await this.appRepo.save(application);
      await this.logEvent(application.id, 'RESUME_MISSING', 'Resume document required before submission');
      return { status: false, message: application.failureReason };
    }

    if (!job.applicationUrl || !/^https?:\/\//i.test(job.applicationUrl)) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      application.failureReason = 'No valid employer application URL is available for this job.';
      await this.appRepo.save(application);
      await this.logEvent(application.id, 'SUBMISSION_NOT_ATTEMPTED', application.failureReason);
      return { status: false, requiresUserAction: true, message: application.failureReason };
    }

    if (!profile.fullName || !profile.email || !masterResume.storagePath) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      application.failureReason = 'Candidate name, email, or resume file is missing. Complete your profile before applying.';
      await this.appRepo.save(application);
      await this.logEvent(application.id, 'CANDIDATE_DATA_INCOMPLETE', application.failureReason);
      return { status: false, requiresUserAction: true, message: application.failureReason };
    }

    application.status = ApplicationStatus.SUBMITTING;
    application.metadata = { ...(application.metadata || {}), submissionAttempted: true, portalUrl: job.applicationUrl };
    await this.appRepo.save(application);

    // The application is successful only after the employer portal displays a confirmation.
    let portalConfirmationText: string | undefined;
    {
      await this.logEvent(
        application.id,
        'BROWSER_SUBMISSION_ATTEMPT',
        `Launching browser automation to submit application on ${job.company} portal...`,
      );

      let browserResult;
      try {
        const coverLetter = await this.docRepo.findOne({ where: { applicationId: application.id, documentType: 'COVER_LETTER' } });
        browserResult = await this.browserService.inspectAndFillPortal(
          job.applicationUrl,
          {
            candidateId: application.candidateId,
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            password: profile.portalPassword || pref?.portalPassword || undefined,
            portalAccounts: (pref?.portalAccounts || profile.portalAccounts) || undefined,
            resumeFilePath: masterResume.storagePath,
            coverLetter: coverLetter?.content || undefined,
          },
          true,
        );
      } catch (error: any) {
        application.status = ApplicationStatus.REVIEW_REQUIRED;
        application.failureReason = 'The employer portal could not be completed automatically. Review the application page manually.';
        await this.appRepo.save(application);
        await this.logEvent(application.id, 'PORTAL_AUTOMATION_FAILED', application.failureReason, { error: error?.message });
        return { status: false, requiresUserAction: true, portalUrl: job.applicationUrl, message: application.failureReason };
      }

      // Record steps
      for (const step of browserResult.steps) {
        await this.logEvent(application.id, step.step, step.detail);
      }

      if (browserResult.hasCaptcha) {
        application.status = ApplicationStatus.REVIEW_REQUIRED;
        application.failureReason = 'Portal requires interactive CAPTCHA verification before final submit.';
        await this.appRepo.save(application);
        await this.logEvent(
          application.id,
          'SUBMISSION_PAUSED_CAPTCHA',
          'Application cannot be submitted automatically due to company CAPTCHA. Open portal link to complete.',
          { portalUrl: job.applicationUrl },
        );
        return {
          status: false,
          requiresUserAction: true,
          portalUrl: job.applicationUrl,
          message: 'Employer portal has interactive CAPTCHA verification. Please open the vacancy link to finalize.',
        };
      }

      if (browserResult.requiresUserAction) {
        application.status = ApplicationStatus.REVIEW_REQUIRED;
        application.failureReason = browserResult.userActionReason || 'Portal requires candidate sign-in.';
        await this.appRepo.save(application);
        await this.logEvent(
          application.id,
          'SUBMISSION_PAUSED_LOGIN',
          browserResult.userActionReason || 'Portal requires candidate account.',
          { portalUrl: job.applicationUrl },
        );
        return {
          status: false,
          requiresUserAction: true,
          portalUrl: job.applicationUrl,
          message: browserResult.userActionReason || 'Company portal requires direct candidate login.',
        };
      }

      if (!browserResult.confirmationDetected) {
        application.status = ApplicationStatus.REVIEW_REQUIRED;
        application.failureReason = 'The employer portal did not confirm receipt. Check the portal and finish the application manually if needed.';
        application.metadata = {
          ...(application.metadata || {}),
          portalConfirmed: false,
          portalUrl: job.applicationUrl,
          browserFinalUrl: browserResult.finalUrl,
          filledFields: browserResult.filledFields.map((field) => field.field),
        };
        await this.appRepo.save(application);
        await this.logEvent(application.id, 'PORTAL_CONFIRMATION_NOT_DETECTED', application.failureReason, { portalUrl: job.applicationUrl });
        return {
          status: false,
          portalConfirmed: false,
          requiresUserAction: true,
          portalUrl: job.applicationUrl,
          message: application.failureReason,
        };
      }
      portalConfirmationText = browserResult.confirmationText;
    }

    application.status = ApplicationStatus.SUBMITTED;
    application.submittedAt = new Date();
    application.failureReason = '';
    application.metadata = {
      ...(application.metadata || {}),
      portalConfirmed: true,
      portalUrl: job.applicationUrl,
      siteRegistered: true,
      registeredHost: portalHost,
    };
    await this.appRepo.save(application);

    await this.logEvent(
      application.id,
      'APPLICATION_SUBMITTED',
      `Employer portal displayed a submission confirmation for ${job.title} at ${job.company}.`,
      { portalConfirmed: true, confirmationText: portalConfirmationText },
    );

    // Send genuine email notification to candidate's real email
    try {
      const emailResult = await this.notificationsService.sendApplicationSubmissionConfirmation({
        candidateEmail: profile.email,
        candidateName: profile.fullName,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        confirmationId: undefined,
        applicationUrl: job.applicationUrl,
        submittedAt: application.submittedAt,
      });

      if (emailResult.sent) {
        await this.logEvent(
          application.id,
          'EMAIL_CONFIRMATION_SENT',
          `Confirmation email dispatched to ${profile.email}`,
          { messageId: emailResult.messageId },
        );
      }
    } catch (err: any) {
      this.logger.warn(`Could not send email notification: ${err.message}`);
    }

    return {
      status: true,
      message: `The ${job.company} portal displayed a submission confirmation.`,
      portalConfirmed: true,
    };
  }

  async verifySubmission(applicationId: string, candidateId: string) {
    const application = await this.appRepo.findOne({ where: { id: applicationId, candidateId } });
    if (!application) {
      return { verified: false, message: 'Application not found' };
    }

    if (application.status !== ApplicationStatus.SUBMITTED || application.metadata?.portalConfirmed !== true) {
      return { verified: false, message: 'The employer portal has not confirmed this application, so it cannot be marked verified.' };
    }

    application.status = ApplicationStatus.VERIFIED;
    await this.appRepo.save(application);

    await this.logEvent(application.id, 'APPLICATION_VERIFIED', `Submission verified via audit check.`);
    return { verified: true, message: 'Application marked verified.' };
  }

  async confirmRegisteredAndApply(applicationId: string, candidateId: string) {
    const application = await this.appRepo.findOne({ where: { id: applicationId, candidateId } });
    if (!application) throw new Error('Application not found');
    const job = await this.jobRepo.findOne({ where: { id: application.jobId } });

    let portalHost = '';
    try { portalHost = new URL(job?.applicationUrl || '').hostname.toLowerCase(); } catch {}

    application.metadata = {
      ...(application.metadata || {}),
      siteRegistered: true,
      registeredHost: portalHost,
      registeredAt: new Date().toISOString(),
      submissionAttempted: false,
    };
    application.failureReason = '';
    await this.appRepo.save(application);

    await this.logEvent(
      application.id,
      'SITE_REGISTRATION_SAVED',
      `Site registration confirmed for ${job?.company || portalHost}. Session saved for automated future applications.`,
      { registeredHost: portalHost },
    );

    // Automatically submit using the saved session!
    return this.submitApplication(applicationId);
  }

  async autoApplyMatchingJobs(userId: string, options: { minScore?: number; limit?: number } = {}) {
    const minScore = options.minScore ?? 60;
    const limit = options.limit ?? 5;

    const [profile, masterResume] = await Promise.all([
      this.profileRepo.findOne({ where: { userId } }),
      this.resumeRepo.findOne({ where: { userId, isMaster: true } }),
    ]);
    if (!profile) throw new Error('Candidate profile not found. Please complete your profile first.');
    const resume = masterResume || (await this.resumeRepo.findOne({ where: { userId }, order: { createdAt: 'DESC' } }));
    if (!resume) throw new Error('Please upload a resume first before auto-applying.');

    // Query active jobs
    const jobs = await this.jobRepo.find({ where: { isActive: true }, order: { postedAt: 'DESC' }, take: 250 });
    const scored = jobs.map((job) => ({
      ...job,
      match: scoreResumeAgainstJob(job, profile, resume.extractedText || ''),
    })).filter((j) => (j.match.score ?? 0) >= minScore)
      .sort((a, b) => (b.match.score ?? 0) - (a.match.score ?? 0))
      .slice(0, limit);

    if (!scored.length) {
      return {
        appliedCount: 0,
        reviewCount: 0,
        message: `No active jobs matched your resume with score >= ${minScore}%. Try uploading an updated resume or adjusting your preferences.`,
      };
    }

    let appliedCount = 0;
    let reviewCount = 0;
    const details: Array<{ jobId: string; company: string; title: string; status: string; message: string }> = [];

    for (const job of scored) {
      let app = await this.appRepo.findOne({ where: { jobId: job.id, candidateId: userId } });
      if (!app) {
        app = await this.appRepo.save(this.appRepo.create({
          id: uuidv4(),
          jobId: job.id,
          candidateId: userId,
          status: ApplicationStatus.DISCOVERED,
        }));
      }

      if ([ApplicationStatus.SUBMITTED, ApplicationStatus.VERIFIED].includes(app.status)) {
        details.push({ jobId: job.id, company: job.company, title: job.title, status: app.status, message: 'Already submitted previously.' });
        continue;
      }

      try {
        const res = await this.submitApplication(app.id);
        if (res.status) {
          appliedCount++;
          details.push({ jobId: job.id, company: job.company, title: job.title, status: 'SUBMITTED', message: res.message });
        } else {
          reviewCount++;
          details.push({ jobId: job.id, company: job.company, title: job.title, status: 'REVIEW_REQUIRED', message: res.message });
        }
      } catch (err: any) {
        details.push({ jobId: job.id, company: job.company, title: job.title, status: 'ERROR', message: err.message });
      }
    }

    return {
      appliedCount,
      reviewCount,
      totalJobs: scored.length,
      details,
      message: appliedCount > 0
        ? `Auto-applied to ${appliedCount} job(s) directly! ${reviewCount > 0 ? `${reviewCount} require one-time registration or review.` : ''}`
        : `Processed ${scored.length} matching jobs. ${reviewCount} paused for first-time site registration (once registered, future jobs on those sites apply automatically).`,
    };
  }

  private async logEvent(applicationId: string, eventType: string, description: string, metadata?: any) {
    const event = this.eventRepo.create({
      id: uuidv4(),
      applicationId,
      eventType,
      description,
      metadata,
    });
    return this.eventRepo.save(event);
  }
}
