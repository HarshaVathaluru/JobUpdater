import { MigrationInterface, QueryRunner } from 'typeorm';

export class CandidateSavedExternalJobs1760000000000 implements MigrationInterface {
  name = 'CandidateSavedExternalJobs1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "candidateOwnerId" uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_candidateOwnerId" ON "jobs" ("candidateOwnerId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_candidateOwnerId"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "candidateOwnerId"`);
  }
}
