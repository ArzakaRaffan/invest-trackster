import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InvestAccessGuard } from './invest-access.guard';
import { InvestCorrectionDto, InvestGoalDto, InvestHoldingDto, InvestHoldingUpdateDto, InvestLedgerDto, InvestPortfolioQuery, InvestProfileDto } from './invest-portfolio.dto';
import { InvestPortfolioService } from './invest-portfolio.service';

@Controller('invest')
@UseGuards(JwtAuthGuard, InvestAccessGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class InvestPortfolioController {
  constructor(private readonly portfolio: InvestPortfolioService) {}

  // One coherent revision for goal/profile/holding/ledger forms. Money is never optimistic.
  @Get('portfolio') read(@CurrentUser() user: AuthUser, @Query() q: InvestPortfolioQuery) { return this.portfolio.read(user.id, q.goalId, q.cursor); }
  @Get('goals') goals(@CurrentUser() user: AuthUser) { return this.portfolio.read(user.id).then(s => ({ revision: s.revision, goals: s.goals })); }
  @Post('goals') createGoal(@CurrentUser() user: AuthUser, @Body() dto: InvestGoalDto) { return this.portfolio.saveGoal(user.id, dto); }
  @Patch('goals/:id') updateGoal(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestGoalDto) { return this.portfolio.saveGoal(user.id, dto, id); }
  @Put('goals/:id/profile') profile(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestProfileDto) { return this.portfolio.saveProfile(user.id, id, dto); }
  @Get('holdings') holdings(@CurrentUser() user: AuthUser, @Query() q: InvestPortfolioQuery) { return this.portfolio.read(user.id, q.goalId).then(s => ({ revision: s.revision, holdings: s.holdings })); }
  @Post('holdings') open(@CurrentUser() user: AuthUser, @Body() dto: InvestHoldingDto) { return this.portfolio.openHolding(user.id, dto); }
  @Patch('holdings/:id') valuation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestHoldingUpdateDto) { return this.portfolio.updateHolding(user.id, id, dto); }
  @Get('ledger') ledger(@CurrentUser() user: AuthUser, @Query() q: InvestPortfolioQuery) { return this.portfolio.read(user.id, q.goalId, q.cursor).then(s => ({ revision: s.revision, ledger: s.ledger, nextCursor: s.nextCursor })); }
  @Post('ledger') record(@CurrentUser() user: AuthUser, @Body() dto: InvestLedgerDto) { return this.portfolio.record(user.id, dto); }
  @Post('ledger/:id/correction') correction(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestCorrectionDto) { return this.portfolio.correct(user.id, id, dto); }
  @Get('reservations') reservations(@CurrentUser() user: AuthUser) { return this.portfolio.read(user.id).then(s => ({ revision: s.revision, reservations: s.reservations })); }
  @Delete('reservations/:id') cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.portfolio.cancelReservation(user.id, id); }
}
