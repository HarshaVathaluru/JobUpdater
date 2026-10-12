import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { JobSourceEntity } from './entities/job-source.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { CandidatePreferenceEntity } from '../candidate/entities/candidate-preference.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity, JobSourceEntity, CandidateProfileEntity, CandidatePreferenceEntity, ResumeEntity])
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
