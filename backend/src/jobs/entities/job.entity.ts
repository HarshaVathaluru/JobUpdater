import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('jobs')
@Unique(['sourceId', 'sourceJobId'])
export class JobEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  sourceId: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  sourceJobId: string;

  @Column()
  company: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'varchar', nullable: true })
  workMode: string;

  @Column({ nullable: true })
  employmentType: string;

  @Column('int', { nullable: true })
  salaryMin: number;

  @Column('int', { nullable: true })
  salaryMax: number;

  @Column({ nullable: true })
  salaryCurrency: string;

  @Column('int', { nullable: true })
  experienceMin: number;

  @Column('int', { nullable: true })
  experienceMax: number;

  @Column('text')
  description: string;

  @Column('simple-json', { default: '[]' })
  responsibilities: string[];

  @Column('simple-json', { default: '[]' })
  requiredSkills: string[];

  @Column('simple-json', { default: '[]' })
  preferredSkills: string[];

  @Column('simple-json', { default: '[]' })
  educationRequirements: string[];

  @Column('simple-json', { default: '[]' })
  otherRequirements: string[];

  @Column({ nullable: true })
  applicationUrl: string;

  @Column({ nullable: true })
  applicationMethod: string;

  @Column({ nullable: true })
  postedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('simple-json', { nullable: true })
  rawData: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


