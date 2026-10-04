import { Controller, Post, Param, Get, UseGuards } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

@Controller('cover-letter')
@UseGuards(JwtAuthGuard)
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) {}

  @Post(':jobId/generate')
  async generateCoverLetter(@Param('jobId') jobId: string, @CurrentUser() user: UserEntity) {
    const document = await this.coverLetterService.generateCoverLetter(user.id, jobId);
    return { data: document, message: 'Cover letter generated successfully' };
  }

  @Get()
  async getAllMyCoverLetters(@CurrentUser() user: UserEntity) {
    const letters = await this.coverLetterService.getAllCoverLetters(user.id);
    return { data: letters };
  }

  @Get('job/:jobId')
  async getCoverLetterForJob(@Param('jobId') jobId: string, @CurrentUser() user: UserEntity) {
    const document = await this.coverLetterService.getCoverLetterForJob(user.id, jobId);
    if (!document) {
      return { message: 'No cover letter found for this job' };
    }
    return { data: document };
  }
}
