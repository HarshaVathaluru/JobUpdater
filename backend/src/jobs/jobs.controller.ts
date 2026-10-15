import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getJobs(
    @CurrentUser() user: UserEntity,
    @Query('postedWithinDays') postedWithinDays?: string,
    @Query('experienceLevel') experienceLevel?: 'ALL' | 'ENTRY' | 'MID' | 'SENIOR',
    @Query('hideLinkedIn') hideLinkedIn?: string,
    @Query('hideShine') hideShine?: string,
  ) {
    const jobs = await this.jobsService.getJobsForCandidate(user.id, {
      postedWithinDays: postedWithinDays ? parseInt(postedWithinDays, 10) : undefined,
      experienceLevel,
      hideLinkedIn: hideLinkedIn === 'true',
      hideShine: hideShine === 'true',
    });
    return { data: jobs };
  }

  @Post('external')
  async saveExternalJob(@CurrentUser() user: UserEntity, @Body() body: {
    source: string;
    title: string;
    company: string;
    location?: string;
    description: string;
    applicationUrl: string;
    employerApplicationUrl?: string;
  }) {
    const job = await this.jobsService.saveExternalJobForCandidate(user.id, body);
    return { data: job, message: 'Listing saved and added to your resume-matched jobs.' };
  }

  @Get(':id')
  async getJob(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    const job = await this.jobsService.getJobById(id, user.id);
    return { data: job };
  }
}
