import { Controller, Post, Param, Get, UseGuards } from '@nestjs/common';
import { ResumeTailoringService } from './resume-tailoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

@Controller('resume-tailoring')
@UseGuards(JwtAuthGuard)
export class ResumeTailoringController {
  constructor(private readonly tailoringService: ResumeTailoringService) {}

  @Post(':jobId')
  async tailorResume(@Param('jobId') jobId: string, @CurrentUser() user: UserEntity) {
    const version = await this.tailoringService.tailorResume(user.id, jobId);
    return { data: version, message: 'Resume tailored successfully' };
  }

  @Get()
  async getMyTailoredResumes(@CurrentUser() user: UserEntity) {
    const versions = await this.tailoringService.getTailoredVersions(user.id);
    return { data: versions };
  }

  @Get('job/:jobId')
  async getTailoredResumeForJob(@Param('jobId') jobId: string, @CurrentUser() user: UserEntity) {
    const version = await this.tailoringService.getTailoredResumeForJob(user.id, jobId);
    if (!version) {
      return { message: 'No tailored resume found for this job' };
    }
    return { data: version };
  }
}
