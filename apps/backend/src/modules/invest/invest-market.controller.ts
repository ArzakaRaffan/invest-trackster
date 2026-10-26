import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InvestAccessGuard } from './invest-access.guard';
import { InvestPayloadGuard } from './invest-payload.guard';
import { InvestMarketService } from './invest-market.service';
import { InvestAccessDto, InvestCatalogDto, InvestEvaluationDto, InvestHoldingInstrumentDto, InvestMarketQuery, InvestObservationDto, InvestReserveDto, InvestSettleDto } from './invest-market.dto';

@Controller('invest')
@UseGuards(JwtAuthGuard, InvestAccessGuard, InvestPayloadGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class InvestMarketController {
  constructor(private readonly market: InvestMarketService) {}
  @Get('instruments') instruments(@CurrentUser() user: AuthUser, @Query() query: InvestMarketQuery) { return this.market.market(user, query); }
  @Get('instruments/:id') instrument(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.market.market(user, {}, id); }
  @Post('catalog/instruments') create(@CurrentUser() user: AuthUser, @Body() dto: InvestCatalogDto) { return this.market.saveCatalog(user, dto); }
  @Patch('catalog/instruments/:id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestCatalogDto) { return this.market.saveCatalog(user, dto, id); }
  @Post('catalog/instruments/:id/observations') quote(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestObservationDto) { return this.market.saveObservation(user, id, dto); }
  @Put('instruments/:id/access') access(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestAccessDto) { return this.market.access(user.id, id, dto); }
  @Put('holdings/:id/instrument') mapping(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestHoldingInstrumentDto) { return this.market.mapHolding(user.id, id, dto); }
  @Post('evaluations') evaluate(@CurrentUser() user: AuthUser, @Body() dto: InvestEvaluationDto) { return this.market.evaluate(user.id, dto); }
  @Get('evaluations') evaluations(@CurrentUser() user: AuthUser, @Query() q: InvestMarketQuery) { return this.market.evaluations(user.id, undefined, q.cursor); }
  @Get('evaluations/:id') evaluation(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.market.evaluations(user.id, id); }
  @Post('reservations') reserve(@CurrentUser() user: AuthUser, @Body() dto: InvestReserveDto) { return this.market.reserve(user.id, dto); }
  @Post('reservations/:id/settle') settle(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestSettleDto) { return this.market.settle(user.id, id, dto); }
}
