import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvestAccessGuard } from './invest-access.guard';
import { InvestController } from './invest.controller';
import { InvestService } from './invest.service';
import { InvestPortfolioService } from './invest-portfolio.service';
import { InvestPortfolioController } from './invest-portfolio.controller';
import { InvestMarketController } from './invest-market.controller';
import { InvestMarketService } from './invest-market.service';
import { InvestPayloadGuard } from './invest-payload.guard';

@Module({ imports: [AuthModule], controllers: [InvestController, InvestPortfolioController, InvestMarketController], providers: [InvestService, InvestPortfolioService, InvestMarketService, InvestAccessGuard, InvestPayloadGuard] })
export class InvestModule {}
