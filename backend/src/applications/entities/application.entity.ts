import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { ApplicationStatus } from '../enums/application-status.enum';

@Entity('applications')
@Unique(['jobId', 'candidateId'])
export class ApplicationEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  jobId: string;

  @Column('uuid')
  candidateId: string;

  @Column('uuid', { nullable: true })
  jobMatchId: string;

  @Column({ type: 'varchar', default: ApplicationStatus.DISCOVERED })
  status: ApplicationStatus;

  @Column({ nullable: true })
  confirmationId: string;

  @Column({ nullable: true })
  submittedAt: Date;

  @Column('text', { nullable: true })
  failureReason: string;

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


