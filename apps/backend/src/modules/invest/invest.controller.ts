import { Body, Controller, Get, Param, Patch, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InvestAccessGuard } from './invest-access.guard';
import { InvestCashDto, InvestEventDto, InvestMonthQuery } from './invest.dto';
import { InvestService } from './invest.service';

@Controller('invest')
@UseGuards(JwtAuthGuard, InvestAccessGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class InvestController {
  constructor(private readonly invest: InvestService) {}

  @Get('status') status(@CurrentUser() user: AuthUser) { return this.invest.status(user.id); }

  @Get('budget') budget(@CurrentUser() user: AuthUser, @Query() query: InvestMonthQuery) {
    return this.invest.budget(user.id, query.month);
  }

  @Get('payment-events') async events(@CurrentUser() user: AuthUser, @Query() query: InvestMonthQuery) {
    const budget = await this.invest.budget(user.id, query.month);
    return { month: budget.month, asOf: budget.asOf, revision: budget.revision, events: budget.events, receipts: budget.receipts, receiptCount: budget.receiptCount, incompleteStreams: budget.incompleteStreams };
  }

  @Put('cash-confirmation') cash(@CurrentUser() user: AuthUser, @Body() dto: InvestCashDto) {
    return this.invest.confirmCash(user.id, dto);
  }

  @Patch('payment-events/:eventKey') reconcile(@CurrentUser() user: AuthUser, @Param('eventKey') key: string, @Body() dto: InvestEventDto) {
    return this.invest.reconcile(user.id, key, dto);
  }
}
