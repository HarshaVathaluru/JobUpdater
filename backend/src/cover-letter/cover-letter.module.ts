import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterController } from './cover-letter.controller';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { ApplicationDocumentEntity } from '../applications/entities/application-document.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity,
      ApplicationDocumentEntity,
      JobEntity,
      CandidateProfileEntity,
      ResumeEntity,
    ]),
  ],
  controllers: [CoverLetterController],
  providers: [CoverLetterService],
  exports: [CoverLetterService],
})
export class CoverLetterModule {}
