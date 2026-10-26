import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvestAccessGuard } from './invest-access.guard';
import { InvestController } from './invest.controller';
import { InvestService } from './invest.service';
import { InvestPortfolioService } from './invest-portfolio.service';
import { InvestPortfolioController } from './invest-portfolio.controller';

@Module({ imports: [AuthModule], controllers: [InvestController, InvestPortfolioController], providers: [InvestService, InvestPortfolioService, InvestAccessGuard] })
export class InvestModule {}
