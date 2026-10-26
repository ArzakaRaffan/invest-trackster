import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, InvestPaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { wibDateKey } from '../../common/wib';
import { buildBudget, fingerprint, INVEST_RULESET, money, monthBounds, PaymentEvent, receiptRevision, validDate } from './invest-budget';
import { InvestCashDto, InvestEventDto } from './invest.dto';
import { accountBudget } from './invest-accounting';
import { evaluateProfile, RiskAnswers } from './invest-profile';

type Tx = Prisma.TransactionClient;

@Injectable()
export class InvestService {
  constructor(private readonly prisma: PrismaService) {}

  async status(userId: number) {
    return this.prisma.$transaction(async tx => {
      const now = new Date();
      const { summary, activeGoal: goal } = await this.snapshot(tx, userId, wibDateKey(now).slice(0, 7), now);
      const p = goal?.profiles[0];
      const profile = goal && p ? evaluateProfile({ goal, answers: p.answers as RiskAnswers, now, cashValid: summary.freeCash !== null,
        confirmedAt: p.confirmedAt, profileGoalVersion: p.goalVersion, conflictsAcknowledged: p.conflictsAcknowledged }) : null;
      const holdingsKnown = goal?.holdingsDeclaration === 'EMPTY' || goal?.holdingsDeclaration === 'ENTERED' && await tx.investHolding.count({ where: { userId, goalId: goal.id } }) > 0;
      return { enabled: true, ruleset: INVEST_RULESET, phase: 'I3', activeGoalId: goal?.id ?? null, setupComplete: !!holdingsKnown && profile?.status === 'READY',
      capabilities: { monthlyBudget: true, cashConfirmation: true, paymentReconciliation: true, profiles: true, portfolio: true, ledger: true, evaluations: true, reservations: true, ai: false },
      coverage: { indonesia: 'PARTIAL_MANUAL', global: process.env.INVEST_GLOBAL_ENABLED === 'true' ? 'GATED' : 'RESEARCH_ONLY', crypto: process.env.INVEST_CRYPTO_ENABLED === 'true' ? 'GATED' : 'RESEARCH_ONLY' } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async snapshot(tx: Tx, userId: number, month: string, now = new Date()) {
    const { start, end } = monthBounds(month);
    const historyStart = new Date(start);
    historyStart.setUTCMonth(historyStart.getUTCMonth() - 3);
    const stored = await tx.investPaymentEvent.findMany({ where: { userId, OR: [{ originalMonth: month }, { scheduledDate: { startsWith: month } }] }, include: { links: true }, orderBy: { eventKey: 'asc' } });
    const linkedIds = stored.flatMap(e => e.links.map(l => l.incomeId));
    const [streams, receipts, balances, expenses, cash, ledger, reservations, activeGoal] = await Promise.all([
      tx.incomeStream.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      tx.income.findMany({ where: { userId, OR: [{ receivedAt: { gte: historyStart, lt: end } }, { id: { in: linkedIds } }] }, orderBy: { id: 'asc' } }),
      tx.bankBalance.findMany({ where: { userId }, select: { source: true, balance: true, lastUpdatedAt: true }, orderBy: { source: 'asc' } }),
      tx.transaction.findMany({ where: { userId, occurredAt: { gte: start, lt: end } }, select: { id: true, amount: true, occurredAt: true, reimbursedAmount: true }, orderBy: { id: 'asc' } }),
      tx.investMonth.findUnique({ where: { userId_month: { userId, month } } }),
      tx.investLedger.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      tx.investReservation.findMany({ where: { userId, status: 'ACTIVE', expiresAt: { gt: now } }, orderBy: { id: 'asc' } }),
      tx.investGoal.findFirst({ where: { userId, status: 'ACTIVE' }, include: { profiles: { orderBy: { version: 'desc' }, take: 1 } } }),
    ]);
    const linkedReceipts = await tx.investReceiptLink.findMany({ where: { userId, incomeId: { in: receipts.map(r => r.id) } }, select: { incomeId: true }, orderBy: { incomeId: 'asc' } });
    const capacity = activeGoal?.profiles[0]?.answers as Record<string, unknown> | undefined;
    const capacityFacts = capacity ? ['essentialExpenseIDR', 'liquidReserveIDR', 'lossCapacityIDR', 'incomeStable', 'urgentObligations', 'nearTermNeed', 'hasDeficit', 'expensiveDebt'].map(k => capacity[k]) : null;
    const financialRevision = fingerprint([month, receipts.map(r => [receiptRevision(r), r.receivedAt <= now]), balances, expenses, activeGoal?.id, activeGoal?.version, activeGoal?.capacityRevision, capacityFacts]);
    const overrides: PaymentEvent[] = stored.map(e => ({ eventKey: e.eventKey, originalMonth: e.originalMonth, scheduledDate: e.scheduledDate, streamId: e.streamId, streamName: e.streamName, expected: money(e.expected), conservative: money(e.conservative), maximum: money(e.maximum), status: e.status, version: e.version, reason: e.reason, links: e.links.map(l => ({ incomeId: l.incomeId, receiptRevision: l.receiptRevision })) }));
    const summary = buildBudget({ month, now, streams, receipts, overrides, cash, financialRevision, knownLinkedIncomeIds: linkedReceipts.map(l => l.incomeId) });
    const accounting = accountBudget({ month, now, actualQuota: summary.actualQuota, cash: summary.cashConfirmation, confirmedLedgerIds: cash?.cashLedgerIds, ledger, reservations });
    const status = accounting.overcommitted ? 'OVERCOMMITTED' : accounting.cashBackdated ? 'STALE_CASH_CONFIRMATION' : summary.status;
    // Fingerprints are recomputed from live source facts: Income edits/deletes/resolve invalidate
    // an Invest result without changing legacy write paths or mutating bank balances.
    const revision = fingerprint([INVEST_RULESET, financialRevision, streams, overrides, cash, linkedReceipts, ledger, reservations, status, summary.events.map(e => [e.eventKey, e.status, e.received])]);
    return { summary: { ...summary, ...accounting, status, canEvaluate: !!activeGoal, capability: 'SOURCED_EVALUATION', cashConfirmation: summary.cashConfirmation ? { ...summary.cashConfirmation, valid: summary.cashConfirmation.valid && !accounting.cashBackdated } : null, revision }, financialRevision, stored, receipts, ledgerIds: ledger.map(l => l.id), activeGoal };
  }

  budget(userId: number, month = wibDateKey(new Date()).slice(0, 7)) {
    return this.prisma.$transaction(async tx => (await this.snapshot(tx, userId, month)).summary, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async write<T>(fn: (tx: Tx) => Promise<T>) {
    try {
      return await this.prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
        throw new ConflictException('Data berubah pada saat yang sama. Muat ulang sebelum menyimpan.');
      }
      throw error;
    }
  }

  confirmCash(userId: number, dto: InvestCashDto) {
    return this.write(async tx => {
      const now = new Date();
      if (dto.month !== wibDateKey(now).slice(0, 7)) throw new UnprocessableEntityException('Kas bebas hanya dapat dikonfirmasi untuk bulan berjalan');
      const { summary, financialRevision, ledgerIds } = await this.snapshot(tx, userId, dto.month, now);
      if (summary.revision !== dto.expectedRevision) throw new ConflictException('Ringkasan berubah. Periksa kembali kas bebas.');
      await tx.investMonth.upsert({ where: { userId_month: { userId, month: dto.month } },
        create: { userId, month: dto.month, cashAmount: dto.amountIDR, cashConfirmedAt: now, financialRevision, cashLedgerIds: ledgerIds },
        update: { cashAmount: dto.amountIDR, cashConfirmedAt: now, financialRevision, cashLedgerIds: ledgerIds, version: { increment: 1 } } });
      return (await this.snapshot(tx, userId, dto.month, now)).summary;
    });
  }

  reconcile(userId: number, eventKey: string, dto: InvestEventDto) {
    if (eventKey.length > 100 || !/^[a-zA-Z0-9-]+$/.test(eventKey)) throw new BadRequestException('ID event tidak valid');
    if (dto.rescheduleTo && !validDate(dto.rescheduleTo)) throw new BadRequestException('Tanggal penjadwalan tidak valid');
    return this.write(async tx => {
      const now = new Date();
      const { summary, stored } = await this.snapshot(tx, userId, dto.month, now);
      const event = summary.events.find(e => e.eventKey === eventKey);
      if (!event) throw new NotFoundException('Event tidak ditemukan');
      if (summary.revision !== dto.expectedRevision || event.version !== dto.expectedVersion) throw new ConflictException('Event berubah. Muat ulang sebelum menyimpan.');
      const closed = now >= monthBounds(dto.month).end;
      const existing = stored.find(e => e.eventKey === eventKey);
      if (closed && !['COMPLETED', 'MISSED', 'CANCELLED'].includes(dto.status)) throw new UnprocessableEntityException('Bulan ditutup; selesaikan atau tandai terlewat');
      if (dto.rescheduleTo && (dto.status !== 'CANCELLED' || dto.incomeIds.length || dto.rescheduleTo <= wibDateKey(now))) throw new UnprocessableEntityException('Penjadwalan ulang memerlukan event dibatalkan, tanpa receipt, dan tanggal di masa depan');
      if (dto.rescheduleTo && event.status === 'COMPLETED') throw new UnprocessableEntityException('Pembayaran sudah selesai. Tinjau ulang statusnya sebelum menjadwalkan ulang.');
      if (['CANCELLED', 'MISSED'].includes(dto.status) && dto.incomeIds.length) throw new UnprocessableEntityException('Event batal/terlewat tidak boleh mempunyai receipt');
      // Moving a partially paid event carries its prior receipts to the replacement, atomically.
      // The new month's forecast then includes only the unpaid residual, not the full amount again.
      const receiptIds = dto.rescheduleTo ? (existing?.links.map(l => l.incomeId) ?? []) : dto.incomeIds;
      const receipts = await tx.income.findMany({ where: { userId, id: { in: receiptIds }, status: 'CONFIRMED', receivedAt: { lte: now } } });
      if (receipts.length !== receiptIds.length || receipts.some(r => r.streamId != null && r.streamId !== event.streamId)) throw new UnprocessableEntityException('Pilih pemasukan CONFIRMED milik akun dan stream yang sesuai');
      if (dto.rescheduleTo && existing?.links.some(l => receiptRevision(receipts.find(r => r.id === l.incomeId)!) !== l.receiptRevision)) throw new ConflictException('Receipt berubah. Cocokkan penerimaan sebelum menjadwalkan ulang.');
      if (dto.status === 'PARTIAL' && !receipts.length) throw new UnprocessableEntityException('Pembayaran sebagian memerlukan receipt');
      if (dto.status === 'SCHEDULED' && receipts.length) throw new UnprocessableEntityException('Gunakan status sebagian atau selesai untuk receipt yang sudah diterima');
      const duplicates = await tx.investReceiptLink.findMany({ where: { userId, incomeId: { in: receiptIds }, ...(existing ? { eventId: { not: existing.id } } : {}) } });
      if (duplicates.length) throw new ConflictException('Receipt sudah digunakan pada event lain');
      const data = { userId, eventKey, originalMonth: event.originalMonth, scheduledDate: event.scheduledDate, streamId: event.streamId, streamName: event.streamName,
        expected: event.expected, conservative: event.conservative, maximum: event.maximum, status: dto.status as InvestPaymentStatus, reason: dto.reason.trim() };
      const saved = await tx.investPaymentEvent.upsert({ where: { userId_eventKey: { userId, eventKey } }, create: data, update: { ...data, version: { increment: 1 } } });
      await tx.investReceiptLink.deleteMany({ where: { userId, eventId: saved.id } });
      if (receipts.length && !dto.rescheduleTo) await tx.investReceiptLink.createMany({ data: receipts.map(r => ({ userId, eventId: saved.id, incomeId: r.id, receiptRevision: receiptRevision(r) })) });
      await tx.investEventAudit.create({ data: { userId, eventKey, version: saved.version, snapshot: { ...data, incomeIds: dto.incomeIds, carriedReceiptIds: dto.rescheduleTo ? receiptIds : [], rescheduleTo: dto.rescheduleTo ?? null } } });
      if (dto.rescheduleTo) {
        const targetKey = `rescheduled-${randomUUID()}`;
        const target = { ...data, eventKey: targetKey, originalMonth: dto.rescheduleTo.slice(0, 7), scheduledDate: dto.rescheduleTo, status: receipts.length ? InvestPaymentStatus.PARTIAL : InvestPaymentStatus.SCHEDULED, reason: `Reschedule ${eventKey}: ${dto.reason.trim()}` };
        // tenancy-ok: target inherits userId from data above, built only from CurrentUser and the scoped source event.
        const replacement = await tx.investPaymentEvent.create({ data: target });
        if (receipts.length) await tx.investReceiptLink.createMany({ data: receipts.map(r => ({ userId, eventId: replacement.id, incomeId: r.id, receiptRevision: receiptRevision(r) })) });
        await tx.investEventAudit.create({ data: { userId, eventKey: targetKey, version: 1, snapshot: { ...target, incomeIds: receiptIds } } });
      }
      return (await this.snapshot(tx, userId, dto.month, now)).summary;
    });
  }
}
