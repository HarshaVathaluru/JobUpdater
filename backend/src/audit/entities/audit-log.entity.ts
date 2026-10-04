import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId: string;

  @Column()
  action: string;

  @Column()
  resource: string;

  @Column('uuid', { nullable: true })
  resourceId: string;

  @Column('simple-json', { nullable: true })
  details: any;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}


