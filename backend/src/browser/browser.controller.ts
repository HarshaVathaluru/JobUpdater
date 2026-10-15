import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BrowserService } from './browser.service';

@Controller('browser')
@UseGuards(JwtAuthGuard)
export class BrowserController {
  constructor(private readonly browserService: BrowserService) {}

  @Post('interactive-session')
  async openSession(
    @CurrentUser() user: any,
    @Body() body: { targetUrl?: string; portalKey?: string; email?: string; password?: string },
  ) {
    return this.browserService.launchInteractiveSession(user.id, body?.targetUrl, {
      portalKey: body?.portalKey,
      email: body?.email,
      password: body?.password,
    });
  }

  @Get('session-status')
  async getStatus(@CurrentUser() user: any) {
    return this.browserService.checkSessionStatus(user.id);
  }
}
