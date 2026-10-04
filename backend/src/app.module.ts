import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CandidateModule } from './candidate/candidate.module';
import { ResumeModule } from './resume/resume.module';
import { JobsModule } from './jobs/jobs.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { MatchingModule } from './matching/matching.module';
import { AtsModule } from './ats/ats.module';
import { AiModule } from './ai/ai.module';
import { ResumeTailoringModule } from './resume-tailoring/resume-tailoring.module';
import { CoverLetterModule } from './cover-letter/cover-letter.module';
import { ApplicationsModule } from './applications/applications.module';
import { BrowserModule } from './browser/browser.module';
import { PoliciesModule } from './policies/policies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    QueueModule,
    AuthModule,
    CandidateModule,
    ResumeModule,
    JobsModule,
    ConnectorsModule,
    MatchingModule,
    AtsModule,
    AiModule,
    ResumeTailoringModule,
    CoverLetterModule,
    ApplicationsModule,
    BrowserModule,
    PoliciesModule,
    NotificationsModule,
    AuditModule,
  ],
})
export class AppModule {}
