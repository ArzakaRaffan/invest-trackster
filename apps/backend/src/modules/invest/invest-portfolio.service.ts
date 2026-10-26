import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InvestGoal, InvestHolding, InvestLedger, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { wibDateKey } from '../../common/wib';
import { fingerprint, INVEST_RULESET, InvestDecimal, money, validDate } from './invest-budget';
import { InvestService } from './invest.service';
import { creditBalance, holdingQuantity } from './invest-accounting';
import { evaluateProfile, RiskAnswers, riskHash } from './invest-profile';
import { InvestCorrectionDto, InvestGoalDto, InvestHoldingDto, InvestHoldingUpdateDto, InvestLedgerDto, InvestMovementDto, InvestProfileDto, InvestWriteDto } from './invest-portfolio.dto';

type Tx = Prisma.TransactionClient;
const D = InvestDecimal;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value != null && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
const invalid = (message: string): never => { throw new UnprocessableEntityException(message); };

@Injectable()
export class InvestPortfolioService {
  constructor(private readonly prisma: PrismaService, private readonly invest: InvestService) {}

  async state(tx: Tx, userId: number, now = new Date()) {
    const [goals, holdings, ledger, reservations, budget, access, catalogVersions] = await Promise.all([
      tx.investGoal.findMany({ where: { userId }, include: { profiles: { orderBy: { version: 'desc' }, take: 1 } }, orderBy: { id: 'asc' } }),
      tx.investHolding.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      tx.investLedger.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      tx.investReservation.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      this.invest.snapshot(tx, userId, wibDateKey(now).slice(0, 7), now),
      tx.investInstrumentAccess.findMany({ where: { userId }, orderBy: { instrumentId: 'asc' } }),
      tx.investInstrument.findMany({ select: { id: true, version: true }, orderBy: { id: 'asc' } }),
    ]);
    const revision = fingerprint([goals, holdings, ledger, reservations, budget.summary.revision, access, catalogVersions]);
    return { goals, holdings, ledger, reservations, budget: budget.summary, revision, now, access };
  }

  private goal(goals: InvestGoal[], id: string) {
    const goal = goals.find(g => g.id === id);
    if (!goal) throw new NotFoundException('Tujuan tidak ditemukan');
    return goal;
  }

  private timestamp(value: string, now: Date) {
    // Require an explicit offset. A date-only or server-local timestamp must not silently become UTC.
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) throw new BadRequestException('Waktu harus mempunyai zona waktu');
    const at = new Date(value);
    if (!Number.isFinite(at.getTime()) || at > now || at < new Date('2000-01-01T00:00:00+07:00')) throw new BadRequestException('Waktu harus valid dan tidak di masa depan');
    return at;
  }

  private async change(tx: Tx, userId: number, entityId: string, kind: string, snapshot: unknown) {
    await tx.investChange.create({ data: { userId, entityId, kind, snapshot: json(snapshot) } });
  }

  async write(userId: number, route: string, dto: InvestWriteDto, action: (tx: Tx, state: Awaited<ReturnType<InvestPortfolioService['state']>>) => Promise<unknown>) {
    const bodyHash = fingerprint(canonical(dto));
    // Retry transaction conflicts, but never retry with a different user revision or payload.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async tx => {
          const previous = await tx.investMutation.findUnique({ where: { userId_route_key: { userId, route, key: dto.idempotencyKey } } });
          if (previous) {
            if (previous.bodyHash !== bodyHash) throw new ConflictException('Kunci kiriman sudah digunakan untuk isian berbeda');
            return previous.response;
          }
          const state = await this.state(tx, userId);
          if (state.revision !== dto.expectedRevision) throw new ConflictException('Data berubah. Periksa data terbaru sebelum menyimpan.');
          const response = json(await action(tx, state));
          await tx.investMutation.create({ data: { userId, route, key: dto.idempotencyKey, bodyHash, response } });
          return response;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
          if (attempt < 2) continue;
          throw new ConflictException('Data berubah bersamaan. Muat ulang sebelum menyimpan.');
        }
        throw error;
      }
    }
  }

  read(userId: number, goalId?: string, cursor?: string) {
    return this.prisma.$transaction(async tx => {
      const s = await this.state(tx, userId);
      if (goalId) this.goal(s.goals, goalId);
      const goals = s.goals.map(({ profiles, ...g }) => {
        const p = profiles[0];
        return { ...g, profile: p ? { id: p.id, version: p.version, answers: p.answers, confirmedAt: p.confirmedAt,
          conflictsAcknowledged: p.conflictsAcknowledged, ...evaluateProfile({ goal: g, answers: p.answers as RiskAnswers, now: s.now, cashValid: s.budget.freeCash !== null,
            confirmedAt: p.confirmedAt, profileGoalVersion: p.goalVersion, conflictsAcknowledged: p.conflictsAcknowledged }) } : null };
      });
      const holdings = s.holdings.filter(h => !goalId || h.goalId === goalId).map(h => this.holdingView(h, s.ledger, s.now));
      const entries = s.ledger.filter(l => !goalId || l.goalId === goalId).reverse();
      const start = cursor ? entries.findIndex(l => l.id === cursor) + 1 : 0;
      if (cursor && !start) throw new NotFoundException('Cursor tidak ditemukan');
      const page = entries.slice(start, start + 50);
      const credits = s.ledger.filter(l => (!goalId || l.goalId === goalId) && l.investmentCashDelta.gt(0) && l.type !== 'REVERSAL').map(l => ({ id: l.id, goalId: l.goalId, type: l.type, allocationMonth: l.allocationMonth, remainingIDR: money(creditBalance(l, s.ledger)) }));
      const active = goals.find(g => g.status === 'ACTIVE');
      return { revision: s.revision, asOf: s.now.toISOString(), goals, activeGoalId: active?.id ?? null,
        setupComplete: !!active && active.profile?.status === 'READY' && (active.holdingsDeclaration === 'EMPTY' || active.holdingsDeclaration === 'ENTERED' && s.holdings.some(h => h.goalId === active.id)),
        holdings, credits, ledger: page.map(l => ({ ...l, reversed: s.ledger.some(r => r.reversalOfId === l.id) })), nextCursor: start + 50 < entries.length ? page.at(-1)!.id : null,
        reservations: s.reservations.filter(r => !goalId || r.goalId === goalId).map(r => ({ ...r, effectiveStatus: r.status === 'ACTIVE' && r.expiresAt <= s.now ? 'EXPIRED' : r.status })),
        budget: s.budget };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private holdingView(h: InvestHolding, ledger: InvestLedger[], now: Date) {
    const movements = ledger.filter(l => l.holdingId === h.id);
    const quantity = h.mode === 'UNITS' ? holdingQuantity(h.openingQuantity, movements) : null;
    const native = h.mode === 'UNITS' ? (h.unitPrice == null ? null : quantity!.times(h.unitPrice)) : h.value;
    const fx = h.currency === 'IDR' ? new D(1) : h.fxToIDR;
    const reasons = ['MANUAL_VALUATION'];
    if (fx == null) reasons.push('MISSING_FX');
    else if (h.currency !== 'IDR' && (!h.fxAsOf || now.getTime() - h.fxAsOf.getTime() > 86400000)) reasons.push('STALE_FX');
    if (movements.some(l => l.createdAt > h.valuationAt && !l.quantityDelta.isZero())) reasons.push('VALUATION_REVIEW_REQUIRED');
    return { ...h, quantity: quantity?.toFixed(12) ?? null, nativeValue: native == null ? null : money(native),
      valueIDR: native == null || fx == null ? null : money(native.times(fx)), valuationReasons: reasons, profitIDR: null,
      valuationVerified: false };
  }

  saveGoal(userId: number, dto: InvestGoalDto, id?: string) {
    if (dto.needDate && !validDate(dto.needDate)) throw new BadRequestException('Tanggal tujuan tidak valid');
    return this.write(userId, id ? `goal/${id}` : 'goals', dto, async (tx, s) => {
      const previous = id ? this.goal(s.goals, id) : null;
      if (previous && previous.version !== dto.expectedVersion) throw new ConflictException('Versi tujuan berubah');
      if (!previous && s.goals.length >= 50) invalid('Maksimal 50 tujuan');
      if (dto.holdingsDeclaration === 'EMPTY' && s.holdings.some(h => h.goalId === id)) invalid('Kepemilikan sudah tercatat; pilih portofolio terisi');
      const switches = dto.status === 'ACTIVE' && previous?.status !== 'ACTIVE';
      if ((switches || (previous?.status === 'ACTIVE' && dto.status === 'DRAFT')) && s.reservations.some(r => r.status === 'ACTIVE' && r.expiresAt > s.now)) invalid('Batalkan reservasi aktif sebelum mengganti tujuan');
      if (switches) {
        for (const old of s.goals.filter(g => g.status === 'ACTIVE')) {
          await tx.investGoal.update({ where: { id_userId: { id: old.id, userId } }, data: { status: 'DRAFT', version: { increment: 1 } } });
          await this.change(tx, userId, old.id, 'GOAL_DEACTIVATED', { previous: old.version, activeGoalId: id ?? 'new' });
        }
      }
      const data = { name: dto.name.trim(), targetAmountIDR: dto.targetAmountIDR ?? null, needDate: dto.needDate ?? null, liquidityDays: dto.liquidityDays ?? null, status: dto.status, holdingsDeclaration: dto.holdingsDeclaration };
      const goal = previous
        ? await tx.investGoal.update({ where: { id_userId: { id: previous.id, userId } }, data: { ...data, version: { increment: 1 } } })
        : await tx.investGoal.create({ data: { ...data, userId } });
      await this.change(tx, userId, goal.id, 'GOAL_SAVED', goal);
      return { id: goal.id, version: goal.version };
    });
  }

  saveProfile(userId: number, goalId: string, dto: InvestProfileDto) {
    return this.write(userId, `profile/${goalId}`, dto, async (tx, s) => {
      const goal = this.goal(s.goals, goalId);
      const old = s.goals.find(g => g.id === goalId)!.profiles[0];
      if ((old?.version ?? 0) !== dto.expectedVersion) throw new ConflictException('Versi profil berubah');
      // Null fields are unknown, never silently false/zero. Canonicalize nullable drafts.
      const answers = Object.fromEntries(Object.entries(dto.answers).filter(([, v]) => v != null)) as RiskAnswers;
      const hash = riskHash(goal, answers);
      if (dto.conflictsAcknowledged && (dto.reviewHash !== hash || old?.reviewHash !== hash)) throw new ConflictException('Tinjau konflik pada jawaban dan versi tujuan terbaru terlebih dahulu');
      const capacityFields = ['essentialExpenseIDR', 'liquidReserveIDR', 'lossCapacityIDR', 'incomeStable', 'urgentObligations', 'nearTermNeed', 'hasDeficit', 'expensiveDebt'];
      const previousAnswers = old?.answers as Record<string, unknown> | undefined;
      const capacityChanged = fingerprint(capacityFields.map(k => previousAnswers?.[k])) !== fingerprint(capacityFields.map(k => answers[k]));
      const result = evaluateProfile({ goal, answers, now: s.now, cashValid: s.budget.freeCash !== null && !capacityChanged, confirmedAt: dto.confirmed ? s.now : null, conflictsAcknowledged: dto.conflictsAcknowledged });
      const profile = await tx.investRiskProfile.create({ data: { userId, goalId, version: (old?.version ?? 0) + 1, goalVersion: goal.version,
        answers: json(answers), result: json(result), ruleset: INVEST_RULESET, reviewHash: hash, conflictsAcknowledged: dto.conflictsAcknowledged, confirmedAt: dto.confirmed ? s.now : null } });
      if (capacityChanged) {
        await tx.investGoal.update({ where: { id_userId: { id: goal.id, userId } }, data: { capacityRevision: { increment: 1 } } });
      }
      return { id: profile.id, version: profile.version, ...result };
    });
  }

  private valuation(dto: InvestHoldingDto | InvestHoldingUpdateDto, now: Date, currency: string) {
    if (dto.mode === 'UNITS' && dto.unitPrice == null) invalid('Isi harga per unit');
    if (dto.mode === 'VALUE' && dto.value == null) invalid('Isi nilai kepemilikan');
    if (dto.mode === 'VALUE' && dto.quantity != null) invalid('Nilai saja tidak mempunyai jumlah unit');
    if (dto.fxToIDR != null && new D(dto.fxToIDR).lte(0)) invalid('Kurs harus lebih dari nol');
    if (currency !== 'IDR' && !!dto.fxToIDR !== !!dto.fxAsOf) invalid('Kurs dan waktu kurs harus diisi bersama');
    return { mode: dto.mode, unitPrice: dto.mode === 'UNITS' ? dto.unitPrice : null, value: dto.mode === 'VALUE' ? dto.value : null,
      valuationAt: this.timestamp(dto.valuationAt, now), fxToIDR: currency === 'IDR' ? '1' : dto.fxToIDR ?? null,
      fxAsOf: currency === 'IDR' ? null : dto.fxAsOf ? this.timestamp(dto.fxAsOf, now) : null, valuationNote: dto.valuationNote.trim() };
  }

  openHolding(userId: number, dto: InvestHoldingDto) {
    return this.write(userId, 'holdings', dto, async (tx, s) => {
      const goal = this.goal(s.goals, dto.goalId);
      if (s.holdings.length >= 500) invalid('Maksimal 500 kepemilikan');
      if (dto.mode === 'UNITS' && dto.quantity == null) invalid('Isi jumlah unit awal, termasuk nol jika belum membeli');
      const openingAt = this.timestamp(dto.openingAt, s.now), valuation = this.valuation(dto, s.now, dto.currency);
      if (valuation.valuationAt < openingAt) invalid('Waktu valuasi tidak boleh sebelum kepemilikan awal');
      const h = await tx.investHolding.create({ data: { userId, goalId: goal.id, label: dto.label.trim(), assetClass: dto.assetClass,
        currency: dto.currency, openingQuantity: dto.mode === 'UNITS' ? dto.quantity : null, openingAt, costBasisIDR: dto.costBasisIDR ?? null, ...valuation } });
      if (goal.holdingsDeclaration !== 'ENTERED') await tx.investGoal.update({ where: { id_userId: { id: goal.id, userId } }, data: { holdingsDeclaration: 'ENTERED' } });
      await this.change(tx, userId, h.id, 'OPENING_HOLDING', h);
      return { id: h.id, version: h.version };
    });
  }

  updateHolding(userId: number, id: string, dto: InvestHoldingUpdateDto) {
    return this.write(userId, `holding/${id}`, dto, async (tx, s) => {
      const h = s.holdings.find(h => h.id === id);
      if (!h) throw new NotFoundException('Kepemilikan tidak ditemukan');
      if (h.version !== dto.expectedVersion) throw new ConflictException('Versi kepemilikan berubah');
      if (h.mode === 'UNITS' && dto.mode === 'VALUE') invalid('Riwayat unit harus dipertahankan');
      if (h.mode === 'VALUE' && dto.mode === 'UNITS' && dto.quantity == null) invalid('Lengkapi jumlah unit untuk konversi');
      const data = this.valuation(dto, s.now, h.currency);
      if (data.valuationAt < h.openingAt) invalid('Waktu valuasi tidak boleh sebelum kepemilikan awal');
      if (dto.quantity != null) {
        const delta = new D(dto.quantity).minus(holdingQuantity(h.openingQuantity, s.ledger.filter(l => l.holdingId === id)));
        if (!delta.isZero() || h.mode === 'VALUE') await tx.investLedger.create({ data: { userId, goalId: h.goalId, holdingId: id, type: 'QUANTITY_ADJUSTMENT', allocationMonth: wibDateKey(s.now).slice(0, 7), occurredAt: s.now,
          principalIDR: 0, feeIDR: 0, quantityDelta: delta, quotaDelta: 0, goalSavingDelta: 0, freeCashDelta: 0, investmentCashDelta: 0, reason: dto.valuationNote.trim() } });
      }
      const saved = await tx.investHolding.update({ where: { id_userId: { id, userId } }, data: { ...data, version: { increment: 1 } } });
      await this.change(tx, userId, id, 'HOLDING_REVIEW', { before: h, after: saved, quantity: dto.quantity ?? null });
      return { id, version: saved.version };
    });
  }

  async movement(tx: Tx, userId: number, dto: InvestMovementDto, now: Date) {
    const s = await this.state(tx, userId, now);
    const goal = this.goal(s.goals, dto.goalId);
    const occurredAt = dto.occurredAt ? this.timestamp(dto.occurredAt, now) : now;
    const currentMonth = wibDateKey(now).slice(0, 7), occurredMonth = wibDateKey(occurredAt).slice(0, 7);
    if (dto.allocationMonth > currentMonth) invalid('Tidak dapat memakai jatah bulan mendatang');
    const principal = new D(dto.principalIDR), fee = new D(dto.feeIDR), total = principal.plus(fee);
    if (principal.lte(0) || total.gte('10000000000000000')) invalid('Nominal harus positif dan dalam kapasitas penyimpanan');
    const units = new D(dto.quantity ?? 0);
    const holding = dto.holdingId ? s.holdings.find(h => h.id === dto.holdingId) : null;
    if (dto.holdingId && !holding) throw new NotFoundException('Kepemilikan tidak ditemukan');
    if (holding && holding.goalId !== goal.id) invalid('Kepemilikan harus sesuai tujuan');
    if (['PURCHASE', 'SALE'].includes(dto.type) && (!holding || holding.mode !== 'UNITS' || units.lte(0) || holding.assetClass === 'CASH')) invalid('Pembelian/penjualan memerlukan kepemilikan non-kas dengan jumlah unit');
    if (!['PURCHASE', 'SALE'].includes(dto.type) && !units.isZero()) invalid('Pergerakan ini tidak mengubah unit');
    if (dto.type === 'GOAL_SAVING' && (holding || !fee.isZero())) invalid('Simpanan tujuan tanpa kepemilikan atau biaya');
    if (holding && occurredAt < holding.openingAt) invalid('Pergerakan tidak boleh sebelum kepemilikan awal');
    if (['SALE', 'DISTRIBUTION'].includes(dto.type) && fee.gt(principal)) invalid('Biaya tidak boleh melampaui hasil');
    if (dto.receiptTransactionId) {
      const receipt = await tx.transaction.findFirst({ where: { userId, id: dto.receiptTransactionId } });
      if (!receipt) throw new NotFoundException('Referensi transaksi tidak ditemukan');
    }
    if (dto.receiptIncomeId) {
      const receipt = await tx.income.findFirst({ where: { userId, id: dto.receiptIncomeId } });
      if (!receipt) throw new NotFoundException('Referensi pemasukan tidak ditemukan');
      if (!['SALE', 'DISTRIBUTION'].includes(dto.type) || receipt.status !== 'INTERNAL') invalid('Hasil investasi yang direferensikan harus diklasifikasikan INTERNAL di Trackster dahulu agar tidak menjadi jatah baru');
    }
    let quota = new D(0), savings = new D(0), cash = new D(0), investmentCash = new D(0), outOfPolicy = false;
    if (dto.fundingEntryId) {
      if (dto.type !== 'PURCHASE') invalid('Referensi alokasi lama hanya untuk pembelian dari kas tujuan');
      const credit = s.ledger.find(l => l.id === dto.fundingEntryId && l.goalId === goal.id && l.investmentCashDelta.gt(0) && l.type !== 'REVERSAL');
      if (!credit) throw new NotFoundException('Asal kas tujuan tidak ditemukan');
      if (dto.allocationMonth !== credit.allocationMonth || occurredAt < credit.occurredAt) invalid('Bulan alokasi dan urutan waktu harus mengikuti asal kas tujuan');
      if (creditBalance(credit, s.ledger).lt(total)) invalid('Kas dari alokasi ini tidak cukup');
      investmentCash = total.neg();
    } else if (['PURCHASE', 'GOAL_SAVING'].includes(dto.type)) {
      const b = dto.allocationMonth === currentMonth ? s.budget : (await this.invest.snapshot(tx, userId, dto.allocationMonth, now)).summary;
      outOfPolicy = goal.status !== 'ACTIVE' || dto.allocationMonth !== occurredMonth || dto.allocationMonth !== currentMonth || b.availableToAllocate == null || total.gt(b.availableToAllocate) || (b.cashConfirmation != null && occurredAt <= new Date(b.cashConfirmation.asOf));
      if (outOfPolicy && !dto.outsideCapAcknowledged) invalid('Realisasi melampaui batas atau perlu rekonsiliasi. Konfirmasi kejadian dan alasannya agar fakta dapat dicatat.');
      if (dto.type === 'PURCHASE') quota = total;
      else { savings = principal; investmentCash = principal; }
      cash = total.neg();
    } else investmentCash = principal.minus(fee);
    const row = await tx.investLedger.create({ data: { userId, goalId: goal.id, holdingId: holding?.id ?? null, type: dto.type, allocationMonth: dto.allocationMonth, occurredAt,
      principalIDR: principal, feeIDR: fee, quantityDelta: dto.type === 'PURCHASE' ? units : dto.type === 'SALE' ? units.neg() : 0,
      quotaDelta: quota, goalSavingDelta: savings, freeCashDelta: cash, investmentCashDelta: investmentCash,
      fundingEntryId: dto.fundingEntryId ?? null, receiptTransactionId: dto.receiptTransactionId ?? null, receiptIncomeId: dto.receiptIncomeId ?? null,
      outOfPolicy, reason: dto.reason.trim() } });
    return row;
  }

  async verifyHistory(tx: Tx, userId: number) {
    const [holdings, ledger] = await Promise.all([
      tx.investHolding.findMany({ where: { userId } }),
      tx.investLedger.findMany({ where: { userId }, orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] }),
    ]);
    // Reverse removes the original fact from effective unit history; both immutable entries remain visible.
    const reversed = new Set(ledger.filter(l => l.reversalOfId).map(l => l.reversalOfId));
    for (const h of holdings) {
      let units = new D(h.openingQuantity ?? 0);
      for (const l of ledger.filter(l => l.holdingId === h.id && l.type !== 'REVERSAL' && !reversed.has(l.id))) {
        units = units.plus(l.quantityDelta);
        if (units.lt(0)) invalid('Riwayat menghasilkan unit negatif. Periksa pembelian/penjualan atau koreksi terkait dahulu.');
      }
    }
    for (const credit of ledger.filter(l => l.investmentCashDelta.gt(0) && l.type !== 'REVERSAL')) {
      if (creditBalance(credit, ledger).lt(0)) invalid('Alokasi sudah dipakai. Koreksi pemakaiannya terlebih dahulu.');
    }
  }

  record(userId: number, dto: InvestLedgerDto) {
    return this.write(userId, 'ledger', dto, async (tx, s) => {
      const row = await this.movement(tx, userId, dto.movement, s.now);
      await this.verifyHistory(tx, userId);
      return { id: row.id, outOfPolicy: row.outOfPolicy };
    });
  }

  correct(userId: number, id: string, dto: InvestCorrectionDto) {
    return this.write(userId, `correction/${id}`, dto, async (tx, s) => {
      const old = s.ledger.find(l => l.id === id);
      if (!old) throw new NotFoundException('Catatan tidak ditemukan');
      if (old.type === 'REVERSAL' || old.type === 'QUANTITY_ADJUSTMENT' || s.ledger.some(l => l.reversalOfId === id)) invalid('Catatan sudah dikoreksi atau perlu penyesuaian unit melalui kepemilikan');
      const row = await tx.investLedger.create({ data: { userId, goalId: old.goalId, holdingId: old.holdingId, type: 'REVERSAL', allocationMonth: old.allocationMonth,
        occurredAt: old.occurredAt, principalIDR: old.principalIDR, feeIDR: old.feeIDR, quantityDelta: old.quantityDelta.neg(), quotaDelta: old.quotaDelta.neg(), goalSavingDelta: old.goalSavingDelta.neg(),
        freeCashDelta: old.freeCashDelta.neg(), investmentCashDelta: old.investmentCashDelta.neg(), fundingEntryId: old.fundingEntryId, reversalOfId: old.id, reason: dto.reason.trim() } });
      if (dto.replacement && dto.replacement.goalId !== old.goalId) invalid('Koreksi harus tetap pada tujuan yang sama');
      const replacement = dto.replacement ? await this.movement(tx, userId, dto.replacement, s.now) : null;
      await this.verifyHistory(tx, userId);
      return { id: row.id, replacementId: replacement?.id ?? null };
    });
  }

  async cancelReservation(userId: number, id: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async tx => {
          const row = await tx.investReservation.findFirst({ where: { userId, id } });
          if (!row) throw new NotFoundException('Reservasi tidak ditemukan');
          if (row.status === 'SETTLED') invalid('Reservasi sudah direalisasikan');
          const result = await tx.investReservation.updateMany({ where: { userId, id, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
          if (result.count) await this.change(tx, userId, id, 'RESERVATION_CANCELLED', { status: 'CANCELLED' });
          return { id, status: 'CANCELLED' };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
          if (attempt < 2) continue;
          throw new ConflictException('Reservasi berubah. Periksa status terbaru.');
        }
        throw error;
      }
    }
  }
}
