import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get()
  async getMyMatches(@CurrentUser() user: UserEntity) {
    const matches = await this.matchingService.getMatchesForCandidate(user.id);
    return { data: matches };
  }

  @Post(':jobId/calculate')
  async calculateMatch(@Param('jobId') jobId: string, @CurrentUser() user: UserEntity) {
    const match = await this.matchingService.calculateMatch(jobId, user.id);
    return { data: match, message: 'ATS match calculated successfully' };
  }
}

