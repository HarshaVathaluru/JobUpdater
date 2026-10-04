import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CandidateService } from './candidate.service';

@Controller('candidate')
@UseGuards(JwtAuthGuard)
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    return this.candidateService.getPreferences(user.id);
  }

  @Post('preferences')
  async savePreferences(@CurrentUser() user: any, @Body() data: any) {
    return this.candidateService.savePreferences(user.id, data);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.candidateService.getProfile(user.id);
  }
}
