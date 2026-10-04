import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('application_questions')
export class ApplicationQuestionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  applicationId: string;

  @Column('text')
  question: string;

  @Column({ nullable: true })
  fieldType: string;

  @Column('text', { nullable: true })
  answer: string;

  @Column('boolean', { default: false })
  isFromProfile: boolean;

  @Column('boolean', { default: false })
  requiresUserInput: boolean;

  @Column('boolean', { default: false })
  userProvided: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


