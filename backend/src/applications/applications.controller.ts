import { Controller, Post, Param, Get, UseGuards, Body } from '@nestjs/common';
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

import { SubmissionService } from './submission.service';

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
  ) {}

  @Get()
  async getMyApplications(@CurrentUser() user: UserEntity) {
    const apps = await this.appRepo.find({ where: { candidateId: user.id }, order: { createdAt: 'DESC' } });
    const appsWithJobs = await Promise.all(
      apps.map(async (app) => {
        const job = await this.jobRepo.findOne({ where: { id: app.jobId } });
        return {
          ...app,
          job: job ? {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            applicationUrl: job.applicationUrl,
            source: job.source,
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

  @Post(':applicationId/submit')
  async submitApplication(@Param('applicationId') applicationId: string, @CurrentUser() user: UserEntity) {
    const app = await this.appRepo.findOne({ where: { id: applicationId, candidateId: user.id } });
    if (!app) return { message: 'Application not found' };

    const result = await this.submissionService.submitApplication(applicationId);
    return { data: result, message: result.message };
  }

  @Post(':applicationId/verify')
  async verifySubmission(@Param('applicationId') applicationId: string, @CurrentUser() user: UserEntity) {
    const result = await this.submissionService.verifySubmission(applicationId);
    return { data: result, message: result.message };
  }
}
