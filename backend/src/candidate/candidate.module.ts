import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateProfileEntity } from './entities/candidate-profile.entity';
import { CandidatePreferenceEntity } from './entities/candidate-preference.entity';
import { CandidateService } from './candidate.service';
import { CandidateController } from './candidate.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateProfileEntity, CandidatePreferenceEntity]),
  ],
  controllers: [CandidateController],
  providers: [CandidateService],
  exports: [CandidateService],
})
export class CandidateModule {}

