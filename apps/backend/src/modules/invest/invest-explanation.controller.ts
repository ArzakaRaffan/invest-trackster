import { Body, Controller, ExecutionContext, Get, Injectable, Param, Post, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiRateLimitGuard } from '../../common/guards/ai-rate-limit.guard';
import { PrismaService } from '../../prisma.service';
import { InvestAccessGuard } from './invest-access.guard';
import { InvestPayloadGuard } from './invest-payload.guard';
import { InvestExplanationService } from './invest-explanation.service';
import { investAiConfig } from './invest-explanation-provider';
import { Language } from './invest-explanation';

export class InvestExplanationDto { @IsIn(['id', 'en']) language: Language; }
export class InvestExplanationQuery extends InvestExplanationDto {}

/** Ownership is checked before quota; defaults and cached replays make no paid call. */
@Injectable()
export class InvestExplanationQuotaGuard extends AiRateLimitGuard {
  constructor(prisma: PrismaService, private readonly explanations: InvestExplanationService) { super(prisma); }
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest(), userId = req.user.sub;
    req.investEvaluation = await this.explanations.owned(userId, req.params.id);
    if (!investAiConfig() || this.explanations.reusable(await this.explanations.attempt(userId, req.params.id, req.body.language))) return true;
    return super.canActivate(context);
  }
}

@Controller('invest/evaluations')
@UseGuards(JwtAuthGuard, InvestAccessGuard, InvestPayloadGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class InvestExplanationController {
  constructor(private readonly explanations: InvestExplanationService) {}
  @Get(':id/explanation') read(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: InvestExplanationQuery) {
    return this.explanations.read(user.id, id, query.language);
  }
  @Post(':id/explanation')
  @UseGuards(InvestExplanationQuotaGuard)
  async generate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InvestExplanationDto) {
    return this.explanations.generate(user.id, await this.explanations.owned(user.id, id), dto.language);
  }
}
