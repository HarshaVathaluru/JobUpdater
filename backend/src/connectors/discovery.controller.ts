import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post('trigger')
  async trigger(@CurrentUser() user: any) {
    return this.discoveryService.triggerManualDiscovery(user?.id);
  }

  @Get(':jobId')
  async status(@CurrentUser() user: any, @Param('jobId') jobId: string) {
    return this.discoveryService.getManualDiscoveryStatus(jobId, user?.id);
  }
}
