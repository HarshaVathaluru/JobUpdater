import { Entity, PrimaryColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('job_matches')
@Unique(['jobId', 'candidateId'])
export class JobMatchEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  jobId: string;

  @Column('uuid')
  candidateId: string;

  @Column('decimal')
  overallScore: number;

  @Column('decimal', { nullable: true })
  keywordScore: number;

  @Column('decimal', { nullable: true })
  skillsScore: number;

  @Column('decimal', { nullable: true })
  experienceScore: number;

  @Column('decimal', { nullable: true })
  educationScore: number;

  @Column('simple-json', { default: '[]' })
  matchedSkills: string[];

  @Column('simple-json', { default: '[]' })
  missingSkills: string[];

  @Column('simple-json', { default: '{}' })
  hardRequirementsMet: any;

  @Column({ type: 'varchar' })
  recommendation: string;

  @Column('simple-json', { nullable: true })
  analysis: any;

  @CreateDateColumn()
  createdAt: Date;
}


