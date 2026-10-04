import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('candidate_preferences')
export class CandidatePreferenceEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @Column('simple-json', { default: '[]' })
  targetRoles: string[];

  @Column('simple-json', { default: '[]' })
  preferredLocations: string[];

  @Column({ type: 'varchar', default: 'ANY' })
  workMode: string;

  @Column('simple-json', { default: '[]' })
  employmentType: string[];

  @Column('int', { nullable: true })
  minimumSalary: number;

  @Column('simple-json', { nullable: true })
  experienceRange: any;

  @Column('simple-json', { default: '[]' })
  industries: string[];

  @Column('boolean', { default: false })
  willingToRelocate: boolean;

  @Column({ type: 'varchar', default: 'REVIEW_FIRST' })
  autoApplyPolicy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


