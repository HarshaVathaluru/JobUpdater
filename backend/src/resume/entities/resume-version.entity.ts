import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('resume_versions')
export class ResumeVersionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  resumeId: string;

  @Column('uuid', { nullable: true })
  jobId: string;

  @Column({ type: 'varchar' })
  versionType: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  storagePath: string;

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}


