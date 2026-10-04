import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

@Controller('resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(
    @CurrentUser() user: UserEntity,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const resume = await this.resumeService.uploadMasterResume(user.id, file);
    return {
      message: 'Resume uploaded and extracted successfully',
      resumeId: resume.id,
    };
  }

  @Get('master')
  async getMasterResume(@CurrentUser() user: UserEntity) {
    const resume = await this.resumeService.getMasterResume(user.id);
    if (!resume) {
      return { message: 'No master resume found' };
    }
    // Omit extracted text to keep response lean
    const { extractedText, ...rest } = resume;
    return rest;
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: UserEntity) {
    return this.resumeService.getProfile(user.id);
  }
}
