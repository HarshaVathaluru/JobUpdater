import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('application_documents')
export class ApplicationDocumentEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  applicationId: string;

  @Column({ type: 'varchar' })
  documentType: string;

  @Column('uuid', { nullable: true })
  resumeVersionId: string;

  @Column({ nullable: true })
  storagePath: string;

  @Column('text', { nullable: true })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}


