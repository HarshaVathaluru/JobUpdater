import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepository: Repository<AuditLogEntity>,
  ) {}

  async createLog(data: Partial<AuditLogEntity>) {
    const log = this.auditRepository.create({
      id: uuidv4(),
      ...data,
    });
    return this.auditRepository.save(log);
  }
}
