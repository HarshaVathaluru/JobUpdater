import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CandidatePreferenceEntity } from './entities/candidate-preference.entity';
import { CandidateProfileEntity } from './entities/candidate-profile.entity';

@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);

  constructor(
    @InjectRepository(CandidatePreferenceEntity)
    private readonly prefRepo: Repository<CandidatePreferenceEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
  ) {}

  async getPreferences(userId: string): Promise<CandidatePreferenceEntity | null> {
    return this.prefRepo.findOne({ where: { userId } });
  }

  async savePreferences(userId: string, data: Partial<CandidatePreferenceEntity>): Promise<CandidatePreferenceEntity> {
    let pref = await this.prefRepo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.prefRepo.create({
        id: uuidv4(),
        userId,
        targetRoles: [],
        preferredLocations: [],
        workMode: 'ANY',
        employmentType: ['FULL_TIME'],
        industries: [],
        willingToRelocate: false,
        autoApplyPolicy: 'REVIEW_FIRST',
      });
    }

    Object.assign(pref, data);
    return this.prefRepo.save(pref);
  }

  async getProfile(userId: string): Promise<CandidateProfileEntity | null> {
    return this.profileRepo.findOne({ where: { userId } });
  }

  async updateProfile(userId: string, data: Partial<CandidateProfileEntity>): Promise<CandidateProfileEntity> {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) profile = this.profileRepo.create({ id: uuidv4(), userId, fullName: '', email: '' });
    const editableFields: Array<keyof CandidateProfileEntity> = ['fullName', 'email', 'phone', 'location', 'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'achievements'];
    for (const field of editableFields) {
      if (data[field] !== undefined) (profile as any)[field] = data[field];
    }
    return this.profileRepo.save(profile);
  }
}
