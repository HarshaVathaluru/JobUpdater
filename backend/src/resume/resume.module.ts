import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeEntity } from './entities/resume.entity';
import { ResumeVersionEntity } from './entities/resume-version.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeEntity, ResumeVersionEntity, CandidateProfileEntity])
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
