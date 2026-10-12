import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Get, NotFoundException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { Response } from 'express';
import * as fs from 'fs';

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
    // Never expose server filesystem paths or extracted resume text to the browser.
    const { extractedText, storagePath, ...rest } = resume;
    return rest;
  }

  @Get('master/download')
  async downloadMasterResume(@CurrentUser() user: UserEntity, @Res() response: Response) {
    const resume = await this.resumeService.getMasterResume(user.id);
    if (!resume || !fs.existsSync(resume.storagePath)) throw new NotFoundException('Uploaded resume file is unavailable.');
    return response.download(resume.storagePath, resume.originalFilename);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: UserEntity) {
    return this.resumeService.getProfile(user.id);
  }
}
