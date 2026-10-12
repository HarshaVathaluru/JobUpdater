import { MigrationInterface, QueryRunner } from 'typeorm';

export class CandidateProfileAchievements1760000000001 implements MigrationInterface {
  name = 'CandidateProfileAchievements1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "achievements" jsonb NOT NULL DEFAULT '[]'::jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "candidate_profiles" DROP COLUMN IF EXISTS "achievements"`);
  }
}
