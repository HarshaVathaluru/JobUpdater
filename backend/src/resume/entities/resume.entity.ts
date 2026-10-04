import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('resumes')
export class ResumeEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column()
  storagePath: string;

  @Column('text', { nullable: true })
  extractedText: string;

  @Column('boolean', { default: false })
  isMaster: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


