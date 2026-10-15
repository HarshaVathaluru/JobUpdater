import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrowserService } from './browser.service';
import { BrowserController } from './browser.controller';
import { CandidatePreferenceEntity } from '../candidate/entities/candidate-preference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CandidatePreferenceEntity])],
  controllers: [BrowserController],
  providers: [BrowserService],
  exports: [BrowserService],
})
export class BrowserModule {}
