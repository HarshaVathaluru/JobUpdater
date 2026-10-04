import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('candidate_profiles')
export class CandidateProfileEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @Column()
  fullName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  location: string;

  @Column('text', { nullable: true })
  summary: string;

  @Column('simple-json', { default: '[]' })
  skills: any[];

  @Column('simple-json', { default: '[]' })
  experience: any[];

  @Column('simple-json', { default: '[]' })
  education: any[];

  @Column('simple-json', { default: '[]' })
  projects: any[];

  @Column('simple-json', { default: '[]' })
  certifications: any[];

  @Column('simple-json', { default: '[]' })
  achievements: any[];

  @Column('float', { array: true, nullable: true })
  embedding: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}



