import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1696300000000 implements MigrationInterface {
  name = 'InitialSchema1696300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 1. users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);

    // 2. candidate_profiles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "candidate_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying,
        "location" character varying,
        "summary" text,
        "skills" jsonb DEFAULT '[]'::jsonb,
        "experience" jsonb DEFAULT '[]'::jsonb,
        "education" jsonb DEFAULT '[]'::jsonb,
        "projects" jsonb DEFAULT '[]'::jsonb,
        "certifications" jsonb DEFAULT '[]'::jsonb,
        "embedding" float4[],
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_candidate_profiles_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_candidate_profiles_id" PRIMARY KEY ("id")
      );
    `);

    // 3. candidate_preferences
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "candidate_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "targetRoles" jsonb DEFAULT '[]'::jsonb,
        "preferredLocations" jsonb DEFAULT '[]'::jsonb,
        "workMode" character varying NOT NULL DEFAULT 'ANY',
        "employmentType" jsonb DEFAULT '[]'::jsonb,
        "minimumSalary" integer,
        "experienceRange" jsonb,
        "industries" jsonb DEFAULT '[]'::jsonb,
        "willingToRelocate" boolean NOT NULL DEFAULT false,
        "autoApplyPolicy" character varying NOT NULL DEFAULT 'REVIEW_FIRST',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_candidate_preferences_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_candidate_preferences_id" PRIMARY KEY ("id")
      );
    `);

    // 4. job_sources
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_sources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" character varying NOT NULL,
        "config" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastSyncAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_job_sources_name" UNIQUE ("name"),
        CONSTRAINT "PK_job_sources_id" PRIMARY KEY ("id")
      );
    `);

    // 5. jobs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sourceId" uuid,
        "sourceJobId" character varying,
        "company" character varying NOT NULL,
        "title" character varying NOT NULL,
        "location" character varying,
        "workMode" character varying,
        "employmentType" character varying,
        "salaryMin" integer,
        "salaryMax" integer,
        "salaryCurrency" character varying,
        "experienceMin" integer,
        "experienceMax" integer,
        "description" text NOT NULL,
        "responsibilities" jsonb DEFAULT '[]'::jsonb,
        "requiredSkills" jsonb DEFAULT '[]'::jsonb,
        "preferredSkills" jsonb DEFAULT '[]'::jsonb,
        "educationRequirements" jsonb DEFAULT '[]'::jsonb,
        "otherRequirements" jsonb DEFAULT '[]'::jsonb,
        "applicationUrl" character varying,
        "applicationMethod" character varying,
        "postedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "rawData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_jobs_source_sourceJobId" UNIQUE ("sourceId", "sourceJobId"),
        CONSTRAINT "PK_jobs_id" PRIMARY KEY ("id")
      );
    `);

    // 6. resumes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resumes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "originalFilename" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "storagePath" character varying NOT NULL,
        "extractedText" text,
        "isMaster" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resumes_id" PRIMARY KEY ("id")
      );
    `);

    // 7. resume_versions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resume_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "resumeId" uuid NOT NULL,
        "jobId" uuid,
        "versionType" character varying NOT NULL,
        "content" text NOT NULL,
        "storagePath" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_versions_id" PRIMARY KEY ("id")
      );
    `);

    // 8. job_matches
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_matches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "jobId" uuid NOT NULL,
        "candidateId" uuid NOT NULL,
        "overallScore" numeric NOT NULL,
        "keywordScore" numeric,
        "skillsScore" numeric,
        "experienceScore" numeric,
        "educationScore" numeric,
        "matchedSkills" jsonb DEFAULT '[]'::jsonb,
        "missingSkills" jsonb DEFAULT '[]'::jsonb,
        "hardRequirementsMet" jsonb DEFAULT '{}'::jsonb,
        "recommendation" character varying NOT NULL,
        "analysis" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_job_matches_job_candidate" UNIQUE ("jobId", "candidateId"),
        CONSTRAINT "PK_job_matches_id" PRIMARY KEY ("id")
      );
    `);

    // 9. applications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "jobId" uuid NOT NULL,
        "candidateId" uuid NOT NULL,
        "jobMatchId" uuid,
        "status" character varying NOT NULL DEFAULT 'DISCOVERED',
        "confirmationId" character varying,
        "submittedAt" TIMESTAMP,
        "failureReason" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_applications_job_candidate" UNIQUE ("jobId", "candidateId"),
        CONSTRAINT "PK_applications_id" PRIMARY KEY ("id")
      );
    `);

    // 10. application_questions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "application_questions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "question" text NOT NULL,
        "fieldType" character varying,
        "answer" text,
        "isFromProfile" boolean NOT NULL DEFAULT false,
        "requiresUserInput" boolean NOT NULL DEFAULT false,
        "userProvided" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_questions_id" PRIMARY KEY ("id")
      );
    `);

    // 11. application_documents
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "application_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "documentType" character varying NOT NULL,
        "resumeVersionId" uuid,
        "storagePath" character varying,
        "content" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_documents_id" PRIMARY KEY ("id")
      );
    `);

    // 12. application_events
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "application_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "applicationId" uuid NOT NULL,
        "eventType" character varying NOT NULL,
        "description" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_events_id" PRIMARY KEY ("id")
      );
    `);

    // 13. audit_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "action" character varying NOT NULL,
        "resource" character varying NOT NULL,
        "resourceId" uuid,
        "details" jsonb,
        "ipAddress" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "application_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "application_documents";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "application_questions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "applications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_matches";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_versions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resumes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "jobs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_sources";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_preferences";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_profiles";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
