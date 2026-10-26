import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, InvestEvaluation } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { explanationEvidence, EXPLANATION_VERSION, ExplanationSelection, Language, renderExplanation, validateExplanation } from './invest-explanation';
import { InvestExplanationProvider, investAiConfig } from './invest-explanation-provider';
import { snapshotHash } from './invest-review';

type Attempt = { token: string; state: 'PENDING' | 'COMPLETE'; until: string; selection: ExplanationSelection | null; reason: string | null; completedAt: string | null };
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

@Injectable()
export class InvestExplanationService {
  constructor(private readonly prisma: PrismaService, private readonly provider: InvestExplanationProvider) {}

  async owned(userId: number, id: string) {
    const evaluation = await this.prisma.investEvaluation.findFirst({ where: { id, userId } });
    if (!evaluation) throw new NotFoundException('Evaluasi tidak ditemukan');
    return evaluation;
  }

  private key(id: string, language: Language) { return { route: `/invest/evaluations/${id}/explanation`, key: `${EXPLANATION_VERSION}:${language}` }; }
  async attempt(userId: number, id: string, language: Language) {
    const row = await this.prisma.investMutation.findUnique({ where: { userId_route_key: { userId, ...this.key(id, language) } } });
    return row?.response as Attempt | null;
  }

  reusable(attempt: Attempt | null) { return !!attempt && (!!attempt.selection || new Date(attempt.until).getTime() > Date.now()); }

  private document(evaluation: InvestEvaluation, language: Language, attempt: Attempt | null, disabled = false) {
    const evidence = explanationEvidence(evaluation, language);
    const selection = attempt?.selection && validateExplanation(JSON.stringify(attempt.selection), evidence);
    const enabled = !!investAiConfig() && evidence.supported;
    const waiting = attempt?.state === 'PENDING' && new Date(attempt.until).getTime() > Date.now();
    const reason = !evidence.supported ? 'UNSUPPORTED_VERSION' : disabled ? 'DISABLED' : selection ? null : waiting ? 'IN_PROGRESS' : attempt?.state === 'PENDING' ? 'INTERRUPTED' : attempt?.reason ?? null;
    return { ...renderExplanation(evidence, selection || null), origin: selection ? 'AI_ASSISTED' : 'RULES', fallbackReason: reason,
      generatedAt: attempt?.completedAt ?? null, aiAvailable: enabled, canRequestAi: enabled && !this.reusable(attempt), retryAfter: !selection && this.reusable(attempt) ? attempt!.until : null };
  }

  async read(userId: number, id: string, language: Language) {
    const evaluation = await this.owned(userId, id);
    return this.document(evaluation, language, await this.attempt(userId, id, language));
  }

  async generate(userId: number, evaluation: InvestEvaluation, language: Language) {
    let previous = await this.attempt(userId, evaluation.id, language);
    if (this.reusable(previous)) return this.document(evaluation, language, previous);
    const evidence = explanationEvidence(evaluation, language);
    if (!investAiConfig() || !evidence.supported) return this.document(evaluation, language, previous, true);
    const key = this.key(evaluation.id, language);
    const pending: Attempt = { token: randomUUID(), state: 'PENDING', until: new Date(Date.now() + 60000).toISOString(), selection: null, reason: null, completedAt: null };
    // Unique row + token compare-and-swap protects concurrent requests across processes. No provider call inside a DB transaction.
    let acquired = false;
    if (previous) {
      acquired = (await this.prisma.investMutation.updateMany({ where: { userId, ...key, response: { path: ['token'], equals: previous.token } }, data: { response: json(pending) } })).count === 1;
    } else {
      try {
        await this.prisma.investMutation.create({ data: { userId, ...key, bodyHash: snapshotHash(evidence), response: json(pending) } }); acquired = true;
      } catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error; }
    }
    if (!acquired) return this.document(evaluation, language, await this.attempt(userId, evaluation.id, language));
    const result = await this.provider.generate(evidence);
    const complete: Attempt = { ...pending, state: 'COMPLETE', ...result, completedAt: new Date().toISOString(), until: new Date(Date.now() + 60000).toISOString() };
    await this.prisma.investMutation.updateMany({ where: { userId, ...key, response: { path: ['token'], equals: pending.token } }, data: { response: json(complete) } });
    return this.document(evaluation, language, await this.attempt(userId, evaluation.id, language));
  }
}
