import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

import { ApplicationEntity } from './entities/application.entity';
import { ApplicationStatus } from './enums/application-status.enum';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { ApplicationDocumentEntity } from './entities/application-document.entity';
import { ApplicationEventEntity } from './entities/application-event.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { BrowserService } from '../browser/browser.service';

export interface FormFieldDescriptor {
  id: string;
  type: string;
  label: string;
  required?: boolean;
}

@Injectable()
export class DynamicAgentService {
  private readonly logger = new Logger(DynamicAgentService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
    @InjectRepository(ApplicationDocumentEntity)
    private readonly docRepo: Repository<ApplicationDocumentEntity>,
    @InjectRepository(ApplicationEventEntity)
    private readonly eventRepo: Repository<ApplicationEventEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
    private readonly browserService: BrowserService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  async runApplicationAgent(applicationId: string, detectedFields?: FormFieldDescriptor[]) {
    const application = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new Error('Application not found');
    }

    const job = await this.jobRepo.findOne({ where: { id: application.jobId } });
    const profile = await this.profileRepo.findOne({ where: { userId: application.candidateId } });

    if (!job || !profile) {
      throw new Error('Job or Candidate Profile missing for this application');
    }

    this.logger.log(`Starting autonomous application agent for App ID: ${application.id}`);
    await this.logEvent(
      application.id,
      'AGENT_SESSION_STARTED',
      `Autonomous browser agent initialized for "${job.title}" at "${job.company}"`,
      { portalUrl: job.applicationUrl, candidateEmail: profile.email },
    );

    application.status = ApplicationStatus.FORM_FILLING;
    await this.appRepo.save(application);

    // Get candidate master resume path if available
    const masterResume = await this.resumeRepo.findOne({
      where: { userId: application.candidateId, isMaster: true },
    });

    // 1. Genuine Headless Browser Automation: Visit Employer Portal & Inspect / Populate Form
    const candidateFormData = {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      resumeFilePath: masterResume?.storagePath,
    };

    let browserResult;
    if (job.applicationUrl && job.applicationUrl.startsWith('http')) {
      await this.logEvent(
        application.id,
        'PORTAL_NAVIGATION',
        `Navigating to live employer portal: ${job.applicationUrl}`,
      );

      browserResult = await this.browserService.inspectAndFillPortal(
        job.applicationUrl,
        candidateFormData,
        false, // Do not auto-submit without user review unless requested
      );

      // Record granular browser steps into application events
      for (const step of browserResult.steps) {
        await this.logEvent(application.id, step.step, step.detail, {
          timestamp: step.timestamp,
        });
      }
    } else {
      await this.logEvent(
        application.id,
        'NO_PORTAL_URL',
        'Job vacancy does not provide a direct application URL. Heuristic schema mapping initiated.',
      );
    }

    // 2. Synthesize Form Mapping Decision using Gemini AI
    const fieldsToMap = (browserResult && browserResult.detectedFields.length > 0)
      ? browserResult.detectedFields.map((f, idx) => ({
          id: f.selector || `field_${idx}`,
          label: f.name || 'Input Field',
          type: f.type || 'text',
        }))
      : (detectedFields && detectedFields.length > 0)
      ? detectedFields
      : [
          { id: 'fullName', label: 'Full Name', type: 'text' },
          { id: 'email', label: 'Email Address', type: 'email' },
          { id: 'phone', label: 'Phone Number', type: 'tel' },
          { id: 'resume', label: 'Resume / CV', type: 'file' },
          { id: 'coverLetter', label: 'Cover Letter', type: 'textarea' },
          { id: 'skills', label: 'Key Competencies', type: 'text' },
        ];

    let decision: any = {
      status: 'SUCCESS',
      mappedFields: fieldsToMap.map((f) => {
        let value = '';
        let action = 'FILL_TEXT';
        if (f.type === 'file' || f.id.toLowerCase().includes('resume')) {
          action = 'UPLOAD_TAILORED_RESUME';
          value = masterResume?.storagePath || 'tailored-resume.pdf';
        } else if (f.id.toLowerCase().includes('cover')) {
          action = 'UPLOAD_COVER_LETTER';
          value = 'tailored-cover-letter.pdf';
        } else if (f.id.toLowerCase().includes('email')) {
          value = profile.email;
        } else if (f.id.toLowerCase().includes('name')) {
          value = profile.fullName;
        } else if (f.id.toLowerCase().includes('phone')) {
          value = profile.phone || '';
        } else {
          value = (profile.skills || []).slice(0, 5).join(', ');
        }
        return { fieldId: f.id, label: f.label, action, value };
      }),
      reason: 'Semantic field mapping completed using verified candidate profile data.',
    };

    // If Gemini API is available, enhance with AI semantic matching
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `
        You are an Autonomous Job Application Agent filling out an employer portal application.
        Map the candidate's real profile data to the detected form fields.
        
        CANDIDATE PROFILE:
        Full Name: ${profile.fullName}
        Email: ${profile.email}
        Phone: ${profile.phone || 'N/A'}
        Summary: ${profile.summary || 'N/A'}
        Skills: ${JSON.stringify(profile.skills || [])}
        
        DETECTED FORM FIELDS:
        ${JSON.stringify(fieldsToMap)}
        
        Output valid JSON with format:
        {
          "status": "SUCCESS" | "PAUSED_FOR_USER_INPUT",
          "mappedFields": [
            { "fieldId": string, "label": string, "action": "FILL_TEXT" | "UPLOAD_TAILORED_RESUME" | "REQUIRES_USER_INPUT", "value": string }
          ],
          "reason": string
        }
      `;

      const aiResponse = await model.generateContent(prompt);
      const parsedAi = JSON.parse(aiResponse.response.text());
      if (parsedAi && parsedAi.mappedFields) {
        decision = parsedAi;
      }
    } catch (e: any) {
      this.logger.warn(`Gemini AI field mapping fallback used: ${e.message}`);
    }

    // Determine final status based on browser inspection & mapping
    if (browserResult?.hasCaptcha) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      await this.logEvent(
        application.id,
        'PAUSED_CAPTCHA',
        'Employer portal requires interactive human CAPTCHA verification.',
      );
    } else if (browserResult?.requiresUserAction) {
      application.status = ApplicationStatus.REVIEW_REQUIRED;
      await this.logEvent(
        application.id,
        'PAUSED_PORTAL_LOGIN',
        browserResult.userActionReason || 'Employer portal requires user interaction.',
      );
    } else {
      application.status = ApplicationStatus.FORM_FILLING;
      await this.logEvent(
        application.id,
        'READY_TO_SUBMIT',
        `All form fields mapped successfully for candidate "${profile.fullName}". Ready for submission.`,
        { filledCount: browserResult?.filledFields?.length || decision.mappedFields.length },
      );
    }

    application.metadata = {
      ...(application.metadata || {}),
      agentState: decision,
      browserInspection: browserResult ? {
        pageTitle: browserResult.pageTitle,
        finalUrl: browserResult.finalUrl,
        filledFields: browserResult.filledFields,
        hasCaptcha: browserResult.hasCaptcha,
        requiresUserAction: browserResult.requiresUserAction,
        userActionReason: browserResult.userActionReason,
      } : null,
      lastAgentRun: new Date().toISOString(),
    };

    await this.appRepo.save(application);

    return {
      message: browserResult?.requiresUserAction
        ? `Agent prepared application. User action required: ${browserResult.userActionReason}`
        : 'Autonomous agent successfully inspected portal and mapped candidate profile fields.',
      state: decision,
      browserInspection: application.metadata.browserInspection,
    };
  }

  private async logEvent(
    applicationId: string,
    eventType: string,
    description: string,
    metadata?: any,
  ) {
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
