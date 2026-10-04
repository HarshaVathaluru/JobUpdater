import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from './entities/job.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
  ) {}

  async ingestJobs(jobsData: Partial<JobEntity>[]) {
    let ingestedCount = 0;

    for (const data of jobsData) {
      try {
        if (!data.company || !data.title) {
          continue;
        }

        // Deduplicate: check if this job was already ingested
        let existingJob: JobEntity | null = null;
        if (data.sourceJobId) {
          existingJob = await this.jobRepo.findOne({
            where: { sourceJobId: data.sourceJobId },
          });
        }
        if (!existingJob) {
          existingJob = await this.jobRepo.findOne({
            where: { company: data.company, title: data.title },
          });
        }

        if (existingJob) {
          continue;
        }

        const newJob = this.jobRepo.create({
          id: uuidv4(),
          source: (data as any).source || 'Job Board',
          company: data.company,
          title: data.title,
          location: data.location || 'Remote',
          workMode: data.workMode || 'HYBRID',
          employmentType: data.employmentType || 'FULL_TIME',
          description: data.description || `${data.title} at ${data.company}`,
          requiredSkills: data.requiredSkills || [],
          preferredSkills: data.preferredSkills || [],
          responsibilities: data.responsibilities || [],
          educationRequirements: data.educationRequirements || [],
          otherRequirements: data.otherRequirements || [],
          applicationUrl: data.applicationUrl,
          applicationMethod: data.applicationMethod || 'ONLINE',
          sourceJobId: data.sourceJobId,
          isActive: true,
          postedAt: data.postedAt || new Date(),
        });

        await this.jobRepo.save(newJob);
        ingestedCount++;
      } catch (error) {
        this.logger.error(`Failed to ingest job: ${data.title} at ${data.company}`, error);
      }
    }

    return ingestedCount;
  }

  async getJobs() {
    return this.jobRepo.find({
      order: { createdAt: 'DESC' },
      where: { isActive: true },
      take: 50,
    });
  }

  async getJobById(id: string) {
    return this.jobRepo.findOne({ where: { id } });
  }
}
