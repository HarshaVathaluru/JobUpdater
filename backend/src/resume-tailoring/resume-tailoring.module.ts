import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeTailoringService } from './resume-tailoring.service';
import { ResumeTailoringController } from './resume-tailoring.controller';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { ResumeVersionEntity } from '../resume/entities/resume-version.entity';
import { JobEntity } from '../jobs/entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeEntity, ResumeVersionEntity, JobEntity])
  ],
  controllers: [ResumeTailoringController],
  providers: [ResumeTailoringService],
  exports: [ResumeTailoringService],
})
export class ResumeTailoringModule {}
