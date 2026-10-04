import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from './entities/application.entity';
import { ApplicationQuestionEntity } from './entities/application-question.entity';
import { ApplicationDocumentEntity } from './entities/application-document.entity';
import { ApplicationEventEntity } from './entities/application-event.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { JobMatchEntity } from '../matching/entities/job-match.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { DynamicAgentService } from './dynamic-agent.service';
import { SubmissionService } from './submission.service';
import { ApplicationsController } from './applications.controller';
import { BrowserModule } from '../browser/browser.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity,
      ApplicationQuestionEntity,
      ApplicationDocumentEntity,
      ApplicationEventEntity,
      JobEntity,
      CandidateProfileEntity,
      JobMatchEntity,
      ResumeEntity,
    ]),
    BrowserModule,
    NotificationsModule,
  ],
  controllers: [ApplicationsController],
  providers: [DynamicAgentService, SubmissionService],
  exports: [DynamicAgentService, SubmissionService],
})
export class ApplicationsModule {}
