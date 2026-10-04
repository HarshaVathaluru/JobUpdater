import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getJobs() {
    const jobs = await this.jobsService.getJobs();
    return { data: jobs };
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    const job = await this.jobsService.getJobById(id);
    return { data: job };
  }
}
