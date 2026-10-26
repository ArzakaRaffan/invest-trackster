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
import { InvestExplanationController, InvestExplanationQuotaGuard } from './invest-explanation.controller';
import { InvestExplanationProvider } from './invest-explanation-provider';
import { InvestExplanationService } from './invest-explanation.service';

@Module({ imports: [AuthModule], controllers: [InvestController, InvestPortfolioController, InvestMarketController, InvestExplanationController], providers: [InvestService, InvestPortfolioService, InvestMarketService, InvestAccessGuard, InvestPayloadGuard, InvestExplanationProvider, InvestExplanationService, InvestExplanationQuotaGuard] })
export class InvestModule {}
