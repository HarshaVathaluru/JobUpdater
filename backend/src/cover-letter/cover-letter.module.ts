import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterController } from './cover-letter.controller';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { ApplicationDocumentEntity } from '../applications/entities/application-document.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationEntity, ApplicationDocumentEntity, JobEntity, CandidateProfileEntity])
  ],
  controllers: [CoverLetterController],
  providers: [CoverLetterService],
  exports: [CoverLetterService],
})
export class CoverLetterModule {}
