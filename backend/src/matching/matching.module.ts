import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobMatchEntity } from './entities/job-match.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobMatchEntity, JobEntity, CandidateProfileEntity, ResumeEntity])
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
