import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('application_events')
export class ApplicationEventEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  applicationId: string;

  @Column()
  eventType: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}


