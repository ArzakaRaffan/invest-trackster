import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { wibDateKey } from '../../common/wib';
import { InvestDecimal as D, INVEST_RULESET, money, validDate } from './invest-budget';
import { holdingQuantity } from './invest-accounting';
import { evaluateProfile, RiskAnswers } from './invest-profile';
import { InvestPortfolioService } from './invest-portfolio.service';
import { InvestService } from './invest.service';
import { RESEARCH_CATALOG } from './invest-catalog';
import { checkFullPot, eligibility, EngineInput, evaluateInvest, Instrument, Order, peerKey, PotHolding, quoteReasons } from './invest-engine';
import { InvestAccessDto, InvestCatalogDto, InvestEvaluationDto, InvestFactsDto, InvestHoldingInstrumentDto, InvestMarketQuery, InvestReviewQuery, InvestReviewAckDto, InvestObservationDto, InvestReserveDto, InvestSettleDto } from './invest-market.dto';

import { buildReview, ReviewBaseline, snapshotHash } from './invest-review';

type Tx = Prisma.TransactionClient;
type State = Awaited<ReturnType<InvestPortfolioService['state']>>;
const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
const ENGINE = 'invest-engine-v0.1.0';
const invalid = (message: string): never => { throw new UnprocessableEntityException(message); };

@Injectable()
export class InvestMarketService {
  constructor(private readonly prisma: PrismaService, private readonly portfolio: InvestPortfolioService, private readonly invest: InvestService) {}

  private async catalog(tx: Tx): Promise<Instrument[]> {
    const stored = await tx.investInstrument.findMany({ orderBy: { id: 'asc' }, take: 1000 });
    const records = new Map(RESEARCH_CATALOG.map(i => [i.id, i]));
    for (const row of stored) records.set(row.id, { id: row.id, version: row.version, facts: row.facts as unknown as InvestFactsDto });
    return [...records.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  private async context(tx: Tx, userId: number, s: State, goalId: string | null, month: string, mode: 'ACTUAL' | 'PLAN', peers: InvestEvaluationDto['peers'] = [], selections: InvestEvaluationDto['selections'] = [], budgetOverride?: string) {
    const instruments = await this.catalog(tx), goal = s.goals.find(g => g.id === goalId);
    if (goalId && !goal) throw new NotFoundException('Tujuan tidak ditemukan');
    const snapshot = await this.invest.snapshot(tx, userId, month, s.now), p = goal?.profiles[0];
    const profile = goal && p ? evaluateProfile({ goal, answers: p.answers as RiskAnswers, now: s.now, cashValid: s.budget.freeCash !== null,
      confirmedAt: p.confirmedAt, profileGoalVersion: p.goalVersion, conflictsAcknowledged: p.conflictsAcknowledged }) : null;
    const holdings: PotHolding[] = s.holdings.filter(h => h.goalId === goal?.id).map(h => {
      const rows = s.ledger.filter(l => l.holdingId === h.id), units = holdingQuantity(h.openingQuantity, rows);
      const native = h.mode === 'UNITS' ? h.unitPrice == null ? null : units.times(h.unitPrice) : h.value == null ? null : new D(h.value);
      const instrument = instruments.find(i => i.id === h.instrumentId);
      const reasons: string[] = [];
      const fx = h.currency === 'IDR' ? new D(1) : h.fxToIDR;
      let value = native == null || fx == null ? null : new D(native).times(fx);
      if (h.mode === 'UNITS' && instrument && !quoteReasons(instrument.facts, s.now).length && instrument.facts.sources.every(r => r.store && r.analyze && r.rights === 'PERMITTED')) {
        const q = instrument.facts.quote!; value = units.times(q.price).times(q.fxToIDR);
      } else {
        if (s.now.getTime() - h.valuationAt.getTime() > 86400000) reasons.push('MANUAL_VALUATION_STALE');
        if (h.currency !== 'IDR' && (!h.fxAsOf || s.now.getTime() - h.fxAsOf.getTime() > 86400000)) reasons.push('FX_STALE');
        if (rows.some(r => r.createdAt > h.valuationAt && !r.quantityDelta.isZero())) reasons.push('VALUATION_REVIEW');
      }
      if (instrument && (instrument.facts.assetClass !== h.assetClass || instrument.facts.currency !== h.currency)) reasons.push('MAPPING_MISMATCH');
      if (h.assetClass === 'CASH' && h.currency !== 'IDR') reasons.push('FOREIGN_CASH_REVIEW');
      if (value?.isZero()) reasons.length = 0; // No existing exposure to value; purchases still pass every product gate.
      return { id: h.id, assetClass: h.assetClass, instrumentId: h.instrumentId, valueIDR: value == null ? null : money(value), reasons };
    });
    const b = snapshot.summary;
    const planned = b.plannedQuota == null ? null : money(D.max(0, new D(b.plannedQuota).minus(b.usedQuota).minus(b.goalSavingUsage).minus(b.reservations)));
    const input: EngineInput = { now: s.now, mode, budgetIDR: budgetOverride ?? (mode === 'ACTUAL' ? b.availableToAllocate : planned), profile,
      goal: goal ?? { needDate: null, liquidityDays: null, holdingsDeclaration: 'UNKNOWN' }, holdings,
      cashInGoalIDR: money(s.ledger.filter(l => l.goalId === goal?.id).reduce((n, l) => n.plus(l.investmentCashDelta), new D(0))),
      instruments, access: s.access, peers, selections, globalEnabled: process.env.INVEST_GLOBAL_ENABLED === 'true', cryptoEnabled: process.env.INVEST_CRYPTO_ENABLED === 'true',
      reasons: [...(!goal || goal.status !== 'ACTIVE' ? ['ACTIVE_GOAL_REQUIRED'] : []), ...(mode === 'ACTUAL' && month !== wibDateKey(s.now).slice(0, 7) ? ['CURRENT_MONTH_REQUIRED'] : []), ...(b.overcommitted ? ['OVERCOMMITTED'] : [])] };
    return { input, goal, snapshot, catalogRevision: snapshotHash([ENGINE, instruments, input.globalEnabled, input.cryptoEnabled]), profileId: p?.id ?? null };
  }

  market(user: AuthUser, query: InvestMarketQuery = {}, id?: string, compareIds?: string[]) {
    return this.prisma.$transaction(async tx => {
      const s = await this.portfolio.state(tx, user.id), goal = s.goals.find(g => g.status === 'ACTIVE');
      const ctx = await this.context(tx, user.id, s, goal?.id ?? null, wibDateKey(s.now).slice(0, 7), 'ACTUAL');
      const all = ctx.input.instruments.map(i => {
        const a = s.access.find(a => a.instrumentId === i.id);
        const access = a ? { status: a.status, understood: a.understood, acceptsLock: a.acceptsLock, reviewedAt: a.reviewedAt, instrumentVersion: a.instrumentVersion } : null;
        const accessState = !a ? 'UNKNOWN' : a.instrumentVersion !== i.version || s.now.getTime() - a.reviewedAt.getTime() > 90 * 86400000 ? 'STALE' : a.status;
        return { ...i, peer: peerKey(i.facts), reasons: eligibility(i, ctx.input), access, accessState };
      });
      let list = all.filter(i => (!query.region || i.facts.region === query.region) && (!query.assetClass || i.facts.assetClass === query.assetClass)
        && (!query.search || `${i.facts.name} ${i.facts.issuer} ${i.facts.channel}`.toLowerCase().includes(query.search.trim().toLowerCase()))
        && (!query.peer || i.peer === query.peer) && (!query.access || i.accessState === query.access)
        && (!query.gate || (query.gate === 'ELIGIBLE' ? !i.reasons.length : !!i.reasons.length)));
      if (id) { list = all.filter(i => i.id === id); if (!list.length) throw new NotFoundException('Instrumen tidak ditemukan'); }
      if (compareIds) {
        if (new Set(compareIds).size !== compareIds.length) throw new BadRequestException('Pilih instrumen yang berbeda');
        list = compareIds.map(id => { const item = all.find(i => i.id === id); if (!item) throw new NotFoundException('Instrumen tidak ditemukan'); return item; });
        if (new Set(list.map(i => i.peer)).size !== 1) invalid('Perbandingan harus dalam jenis, kelompok, eksposur, mata uang, dan tenor yang sama');
      }
      const start = query.cursor ? list.findIndex(i => i.id === query.cursor) + 1 : 0;
      if (query.cursor && !start) throw new NotFoundException('Cursor tidak ditemukan');
      const items = list.slice(start, start + 50);
      return { revision: s.revision, asOf: s.now.toISOString(), canWriteCatalog: user.role === 'ADMIN', items, nextCursor: start + 50 < list.length ? items.at(-1)!.id : null,
        peers: [...new Set(ctx.input.instruments.filter(i => i.facts.assetClass !== 'CASH').map(i => peerKey(i.facts)))].sort().map(peer => { const i = ctx.input.instruments.find(i => peerKey(i.facts) === peer)!; return { peer, assetClass: i.facts.assetClass, label: `${i.facts.exposure} · ${i.facts.kind} · ${i.facts.currency} · ${i.facts.tenorBand}` }; }),
        coverage: { total: ctx.input.instruments.length, matched: list.length, indonesia: 'PARTIAL_MANUAL', global: ctx.input.globalEnabled ? 'GATED' : 'RESEARCH_ONLY', crypto: ctx.input.cryptoEnabled ? 'GATED' : 'RESEARCH_ONLY' }, ruleset: INVEST_RULESET };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private validateFacts(f: InvestFactsDto, now: Date) {
    const stamp = (v: string) => {
      if (!/(Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(new Date(v).getTime())) throw new BadRequestException('Waktu bukti harus memuat zona waktu');
    };
    for (const date of [f.reviewedAt, ...f.sources.flatMap(s => [s.observedAt, s.fetchedAt]), ...(f.quote ? [f.quote.asOf, f.quote.fetchedAt, ...(f.quote.fxAsOf ? [f.quote.fxAsOf] : [])] : []), ...(f.history?.secondAsOf ? [f.history.secondAsOf] : [])]) {
      stamp(date); if (new Date(date) > now) throw new BadRequestException('Waktu observasi/review tidak boleh di masa depan');
    }
    for (const date of [f.purchaseUntil, f.validUntil, f.quote?.calendarFrom, f.quote?.calendarThrough, ...(f.quote?.sessionCloses ?? [])].filter(Boolean) as string[]) stamp(date);
    if (f.maturityDate && !validDate(f.maturityDate)) throw new BadRequestException('Tanggal jatuh tempo tidak valid');
    if (f.sources.some(s => new Date(s.observedAt) > new Date(s.fetchedAt))) invalid('Tanggal sumber lebih baru daripada pengambilan');
    for (const s of f.sources) { const u = new URL(s.url); if (u.username || u.password) invalid('URL sumber tidak boleh berisi kredensial'); }
    if (new Set(f.sources.map(s => s.url)).size !== f.sources.length) invalid('Sumber harus unik');
    if (f.quote || f.history) {
      if (f.sources.some(s => s.rights !== 'PERMITTED' || !s.store || !s.display || !s.analyze || !s.rightsEvidence.trim())) invalid('Lengkapi bukti hak pakai sebelum menyimpan quote/histori untuk analisis dan tampilan');
    }
    if (f.kind === 'CRYPTO' && (f.assetClass !== 'CRYPTO' || f.region !== 'CRYPTO') || f.kind !== 'CRYPTO' && f.assetClass === 'CRYPTO') invalid('Jenis dan kelompok crypto harus sesuai');
    if (f.kind === 'STOCK' && f.assetClass !== 'EQUITY' || f.kind === 'CONTRACTUAL' && !['BONDS', 'CASH'].includes(f.assetClass)) invalid('Jenis dan kelompok instrumen tidak sesuai');
    if (f.quote && (new D(f.quote.price).lte(0) || new D(f.quote.fxToIDR).lte(0) || new Date(f.quote.asOf) > new Date(f.quote.fetchedAt))) invalid('Quote tidak valid');
    if (f.currency === 'IDR' && (f.quote && !new D(f.quote.fxToIDR).eq(1) || f.fees && (!new D(f.fees.fxBuyRate).isZero() || !new D(f.fees.fxRoundTripRate).isZero()))) invalid('Instrumen IDR tidak memakai biaya konversi FX');
    if (f.unitStep != null && new D(f.unitStep).lte(0)) invalid('Step unit harus positif');
  }

  saveCatalog(user: AuthUser, dto: InvestCatalogDto, pathId?: string) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Hanya pengelola catalog yang dapat meninjau sumber');
    if (pathId && pathId !== dto.instrumentId) throw new BadRequestException('ID instrumen tidak sesuai');
    return this.portfolio.write(user.id, `catalog/${dto.instrumentId}`, dto, async (tx, s) => {
      this.validateFacts(dto.facts, s.now);
      const old = await tx.investInstrument.findUnique({ where: { id: dto.instrumentId } });
      if ((old?.version ?? 0) !== dto.expectedVersion) throw new ConflictException('Versi catalog berubah');
      if (!old && await tx.investInstrument.count() >= 1000) invalid('Maksimal1000 catatan catalog manual');
      if (!old && await tx.investInstrument.count() >= 1000) invalid('Batas1000 catatan tercapai; perluas kapasitas sebelum menambah catalog');
      const version = (old?.version ?? 0) + 1, facts = json(dto.facts);
      if (old) await tx.investInstrument.update({ where: { id: old.id }, data: { facts, version } });
      else await tx.investInstrument.create({ data: { id: dto.instrumentId, facts, version } });
      await tx.investCatalogRevision.create({ data: { userId: user.id, instrumentId: dto.instrumentId, version, facts } });
      return { id: dto.instrumentId, version };
    });
  }

  saveObservation(user: AuthUser, id: string, dto: InvestObservationDto) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Hanya pengelola catalog');
    return this.portfolio.write(user.id, `observation/${id}`, dto, async (tx, s) => {
      const old = await tx.investInstrument.findUnique({ where: { id } });
      if (!old) throw new NotFoundException('Simpan metadata instrumen terlebih dahulu');
      if (old.version !== dto.expectedVersion) throw new ConflictException('Versi catalog berubah');
      const facts = { ...(old.facts as unknown as InvestFactsDto), quote: dto.quote };
      this.validateFacts(facts, s.now);
      const version = old.version + 1;
      await tx.investInstrument.update({ where: { id }, data: { facts: json(facts), version } });
      await tx.investCatalogRevision.create({ data: { userId: user.id, instrumentId: id, version, facts: json(facts) } });
      return { id, version };
    });
  }

  access(userId: number, id: string, dto: InvestAccessDto) {
    return this.portfolio.write(userId, `access/${id}`, dto, async (tx, s) => {
      const i = (await this.catalog(tx)).find(i => i.id === id);
      if (!i) throw new NotFoundException('Instrumen tidak ditemukan');
      const data = { instrumentVersion: i.version, status: dto.status, understood: dto.understood, acceptsLock: dto.acceptsLock, reviewedAt: s.now };
      await tx.investInstrumentAccess.upsert({ where: { userId_instrumentId: { userId, instrumentId: id } }, create: { userId, instrumentId: id, ...data }, update: data });
      await tx.investChange.create({ data: { userId, entityId: id, kind: 'ACCESS_REVIEW', snapshot: json(data) } });
      return { instrumentId: id, ...data };
    });
  }

  mapHolding(userId: number, id: string, dto: InvestHoldingInstrumentDto) {
    return this.portfolio.write(userId, `holding-instrument/${id}`, dto, async (tx, s) => {
      const h = s.holdings.find(h => h.id === id), i = (await this.catalog(tx)).find(i => i.id === dto.instrumentId);
      if (!h || !i) throw new NotFoundException('Kepemilikan atau instrumen tidak ditemukan');
      if (h.assetClass !== i.facts.assetClass || h.currency !== i.facts.currency) invalid('Kelompok/mata uang harus cocok');
      await tx.investHolding.update({ where: { id_userId: { id, userId } }, data: { instrumentId: i.id, version: { increment: 1 } } });
      await tx.investChange.create({ data: { userId, entityId: id, kind: 'HOLDING_MAPPING', snapshot: json({ before: h.instrumentId, after: i.id }) } });
      return { id, instrumentId: i.id };
    });
  }

  evaluate(userId: number, dto: InvestEvaluationDto) {
    if (new Set(dto.peers.map(p => p.assetClass)).size !== dto.peers.length) throw new BadRequestException('Pilih satu eksposur per kelompok');
    if (new Set(dto.selections?.map(p => p.assetClass)).size !== (dto.selections?.length ?? 0)) throw new BadRequestException('Pilih satu kandidat per kelompok');
    return this.portfolio.write(userId, 'evaluations', dto, async (tx, s) => {
      const ctx = await this.context(tx, userId, s, dto.goalId, dto.month, dto.mode, dto.peers, dto.selections), result = evaluateInvest(ctx.input);
      const saved = await tx.investEvaluation.create({ data: { userId, goalId: dto.goalId, month: dto.month, mode: dto.mode, ruleset: INVEST_RULESET,
        inputRevision: s.revision, financialRevision: ctx.snapshot.financialRevision, catalogRevision: ctx.catalogRevision,
        input: json({ engine: ENGINE, input: ctx.input, profileId: ctx.profileId, goalVersion: ctx.goal!.version, budget: ctx.snapshot.summary }), result: json(result) } });
      return { id: saved.id, result };
    });
  }

  evaluations(userId: number, id?: string, cursor?: string) {
    return this.prisma.$transaction(async tx => {
      if (id) {
        const e = await tx.investEvaluation.findFirst({ where: { userId, id } });
        if (!e) throw new NotFoundException('Evaluasi tidak ditemukan');
        const s = await this.portfolio.state(tx, userId), data = e.input as any;
        const ctx = await this.context(tx, userId, s, e.goalId, e.month, e.mode as 'ACTUAL' | 'PLAN', data.input.peers, data.input.selections);
        const freshResult = evaluateInvest(ctx.input), result = e.result as ReturnType<typeof evaluateInvest>;
        const stale = e.ruleset !== INVEST_RULESET || data.engine !== ENGINE || s.revision !== e.inputRevision || ctx.catalogRevision !== e.catalogRevision || snapshotHash(freshResult) !== snapshotHash(result);
        const reservation = await tx.investReservation.findFirst({ where: { userId, evaluationId: id }, orderBy: { createdAt: 'desc' } });
        return { ...e, stale, canReserve: !stale && e.mode === 'ACTUAL' && ['READY', 'PARTIAL'].includes(result.status) && result.orders.length > 0 && !reservation,
          reservation: reservation ? { id: reservation.id, status: reservation.status, expiresAt: reservation.expiresAt } : null };
      }
      if (cursor && !await tx.investEvaluation.findFirst({ where: { userId, id: cursor } })) throw new NotFoundException('Cursor tidak ditemukan');
      const rows = await tx.investEvaluation.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, month: true, mode: true, ruleset: true, createdAt: true, result: true } });
      return { items: rows.slice(0, 20).map(r => ({ ...r, result: { status: (r.result as any).status, budgetIDR: (r.result as any).budgetIDR } })), nextCursor: rows.length > 20 ? rows[19].id : null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async review(tx: Tx, userId: number, s: State, e: Prisma.InvestEvaluationGetPayload<{}>, ctx?: Awaited<ReturnType<InvestMarketService['context']>>) {
    if (e.mode !== 'ACTUAL') invalid('Review memakai evaluasi aktual');
    ctx ??= await this.context(tx, userId, s, e.goalId, wibDateKey(s.now).slice(0, 7), 'ACTUAL');
    const result = buildReview(e as unknown as ReviewBaseline, { input: ctx.input, budget: ctx.snapshot.summary, revision: s.revision, catalogRevision: ctx.catalogRevision, profileId: ctx.profileId, goalVersion: ctx.goal!.version, engine: ENGINE });
    const ack = await tx.investChange.findFirst({ where: { userId, entityId: e.id, kind: 'REVIEW_ACK', snapshot: { path: ['reviewKey'], equals: result.reviewKey } }, orderBy: { createdAt: 'desc' } });
    return { ...result, id: e.id, goalId: e.goalId, goalName: ctx.goal!.name, baselineAt: e.createdAt, baselineMonth: e.month, asOf: s.now.toISOString(), revision: s.revision,
      status: ack ? 'ACKNOWLEDGED' : result.reasons.length ? 'NEEDS_REVIEW' : 'NO_CHANGE', acknowledgment: ack ? { id: ack.id, at: ack.createdAt, note: (ack.snapshot as any).note } : null };
  }

  reviews(userId: number, query: InvestReviewQuery) {
    return this.prisma.$transaction(async tx => {
      const s = await this.portfolio.state(tx, userId);
      if (query.cursor && !await tx.investEvaluation.findFirst({ where: { userId, id: query.cursor, mode: 'ACTUAL' } })) throw new NotFoundException('Cursor tidak ditemukan');
      const rows = await tx.investEvaluation.findMany({ where: { userId, mode: 'ACTUAL', ...(query.evaluationId ? { id: query.evaluationId } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 11, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}) });
      if (query.evaluationId && !rows.length) throw new NotFoundException('Evaluasi aktual tidak ditemukan');
      const contexts = new Map<string, Awaited<ReturnType<InvestMarketService['context']>>>(), items: Awaited<ReturnType<InvestMarketService['review']>>[] = [];
      for (const e of rows.slice(0, 10)) {
        if (!contexts.has(e.goalId)) contexts.set(e.goalId, await this.context(tx, userId, s, e.goalId, wibDateKey(s.now).slice(0, 7), 'ACTUAL'));
        items.push(await this.review(tx, userId, s, e, contexts.get(e.goalId)));
      }
      return { items, nextCursor: rows.length > 10 ? rows[9].id : null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 });
  }

  acknowledge(userId: number, id: string, dto: InvestReviewAckDto) {
    return this.portfolio.write(userId, `review/${id}`, dto, async (tx, s) => {
      const e = await tx.investEvaluation.findFirst({ where: { userId, id } });
      if (!e) throw new NotFoundException('Evaluasi tidak ditemukan');
      const result = await this.review(tx, userId, s, e);
      if (result.reviewKey !== dto.reviewKey) throw new ConflictException('Keadaan review berubah; periksa hasil terbaru');
      if (result.acknowledgment) return result.acknowledgment;
      const ack = await tx.investChange.create({ data: { userId, entityId: id, kind: 'REVIEW_ACK', snapshot: json({ ...result, note: dto.note }) } });
      return { id: ack.id, at: ack.createdAt, note: dto.note };
    });
  }

  reserve(userId: number, dto: InvestReserveDto) {
    return this.portfolio.write(userId, 'reservations', dto, async (tx, s) => {
      const e = await tx.investEvaluation.findFirst({ where: { userId, id: dto.evaluationId } });
      if (!e) throw new NotFoundException('Evaluasi tidak ditemukan');
      const data = e.input as any;
      if (e.mode !== 'ACTUAL' || e.ruleset !== INVEST_RULESET || data.engine !== ENGINE) invalid('Gunakan evaluasi aktual yang berlaku');
      if (e.inputRevision !== s.revision) throw new ConflictException('Input berubah; evaluasi ulang sebelum reservasi');
      const ctx = await this.context(tx, userId, s, e.goalId, e.month, 'ACTUAL', data.input.peers, data.input.selections), result = evaluateInvest(ctx.input);
      if (e.catalogRevision !== ctx.catalogRevision || snapshotHash(e.result) !== snapshotHash(result)) throw new ConflictException('Data sumber/kelayakan berubah; evaluasi ulang');
      if (!['READY', 'PARTIAL'].includes(result.status) || !result.orders.length || !result.budgetIDR) invalid('Evaluasi belum mempunyai nominal yang layak');
      if (await tx.investReservation.findFirst({ where: { userId, evaluationId: e.id } })) invalid('Evaluasi sudah pernah direservasi; buat evaluasi baru');
      const expiresAt = new Date(s.now.getTime() + 86400000);
      const row = await tx.investReservation.create({ data: { userId, goalId: e.goalId, evaluationId: e.id, allocationMonth: e.month, inputRevision: s.revision,
        amountIDR: result.budgetIDR!, expiresAt, plan: json({ orders: result.orders, residualCashIDR: result.residualCashIDR, financialRevision: e.financialRevision, catalogRevision: e.catalogRevision, profileId: data.profileId, goalVersion: data.goalVersion, engine: ENGINE, peers: data.input.peers, selections: data.input.selections }) } });
      return { id: row.id, amountIDR: money(row.amountIDR), expiresAt, plan: row.plan };
    });
  }

  settle(userId: number, id: string, dto: InvestSettleDto) {
    return this.portfolio.write(userId, `settle/${id}`, dto, async (tx, s) => {
      const r = s.reservations.find(r => r.id === id);
      if (!r) throw new NotFoundException('Reservasi tidak ditemukan');
      if (r.status !== 'ACTIVE' || r.expiresAt <= s.now || !r.plan) invalid('Reservasi tidak aktif. Realisasi yang terlanjur terjadi tetap dapat dicatat lewat portofolio manual.');
      const plan = r.plan as any;
      const ctx = await this.context(tx, userId, s, r.goalId, r.allocationMonth, 'ACTUAL', plan.peers, plan.selections, money(r.amountIDR));
      if (ctx.profileId !== plan.profileId || ctx.goal?.version !== plan.goalVersion || ctx.snapshot.financialRevision !== plan.financialRevision || ctx.catalogRevision !== plan.catalogRevision || plan.engine !== ENGINE) throw new ConflictException('Input/sumber berubah; tinjau ulang atau catat fakta melalui portofolio manual');
      if (ctx.input.reasons.length || ctx.input.profile?.status !== 'READY' || ctx.input.holdings.some(h => h.reasons.length || h.valueIDR == null)) invalid('Keadaan tujuan, kas atau valuasi perlu ditinjau');
      const proposed = plan.orders as Order[];
      if (dto.orders.length !== proposed.length || new Set(dto.orders.map(o => o.instrumentId)).size !== proposed.length) invalid('Lengkapi satu realisasi untuk setiap kandidat rencana');
      const actual: Order[] = dto.orders.map(a => {
        const o = proposed.find(o => o.instrumentId === a.instrumentId), i = ctx.input.instruments.find(i => i.id === a.instrumentId);
        if (!o || !i || eligibility(i, ctx.input).length) invalid('Instrumen/quote tidak lagi layak; catat fakta melalui portofolio manual');
        const q = new D(a.quantity), principal = new D(a.principalIDR), fee = new D(a.feeIDR), value = q.times(i!.facts.quote!.price).times(i!.facts.quote!.fxToIDR);
        if (q.lte(0) || q.gt(o!.quantity) || !q.mod(i!.facts.unitStep!).isZero() || principal.lt(i!.facts.minimumIDR!) || value.lte(0) || principal.minus(value).abs().div(value).gt('.01') || fee.div(principal.plus(fee)).gt('.01')) invalid('Realisasi di luar unit/minimum/quote/biaya rencana; gunakan pencatatan manual dengan alasan');
        return { ...o!, quantity: a.quantity, principalIDR: a.principalIDR, feeIDR: a.feeIDR, totalIDR: money(principal.plus(fee)) };
      });
      const total = actual.reduce((v, o) => v.plus(o.totalIDR), new D(0)), residual = new D(r.amountIDR).minus(total);
      if (residual.lt(0) || !checkFullPot(ctx.input, actual, money(r.amountIDR)).passed) invalid('Realisasi melampaui dana atau batas stress');
      // Release the whole contribution inside this transaction; actual purchases + explicitly confirmed goal cash replace it once.
      await tx.investReservation.updateMany({ where: { userId, id, status: 'ACTIVE' }, data: { status: 'SETTLED' } });
      const free = (await this.invest.snapshot(tx, userId, r.allocationMonth, s.now)).summary.availableToAllocate;
      if (free == null || new D(free).lt(r.amountIDR)) invalid('Jatah/kas tidak cukup setelah pemeriksaan ulang');
      const ids: string[] = [];
      for (const o of actual) {
        const i = ctx.input.instruments.find(i => i.id === o.instrumentId)!;
        let holding = s.holdings.find(h => h.goalId === r.goalId && h.instrumentId === i.id && h.mode === 'UNITS');
        if (!holding) holding = await tx.investHolding.create({ data: { userId, goalId: r.goalId, instrumentId: i.id, label: i.facts.name.slice(0, 100), assetClass: i.facts.assetClass, currency: i.facts.currency,
          mode: 'UNITS', openingQuantity: 0, openingAt: s.now, unitPrice: i.facts.quote!.price, valuationAt: s.now, fxToIDR: i.facts.quote!.fxToIDR, fxAsOf: s.now, valuationNote: 'Realisasi manual dari evaluasi bersumber' } });
        const row = await this.portfolio.movement(tx, userId, { goalId: r.goalId, holdingId: holding.id, type: 'PURCHASE', allocationMonth: r.allocationMonth, occurredAt: s.now.toISOString(),
          principalIDR: o.principalIDR, feeIDR: o.feeIDR, quantity: o.quantity, occurredConfirmed: true, outsideCapAcknowledged: false, reason: dto.reason }, s.now);
        ids.push(row.id);
      }
      if (residual.gt(0)) {
        const row = await this.portfolio.movement(tx, userId, { goalId: r.goalId, type: 'GOAL_SAVING', allocationMonth: r.allocationMonth, occurredAt: s.now.toISOString(), principalIDR: money(residual), feeIDR: '0.00', occurredConfirmed: true, outsideCapAcknowledged: false, reason: dto.reason }, s.now);
        ids.push(row.id);
      }
      await tx.investGoal.update({ where: { id_userId: { id: r.goalId, userId } }, data: { holdingsDeclaration: 'ENTERED' } });
      await tx.investReservation.updateMany({ where: { userId, id }, data: { settledLedgerIds: ids } });
      await this.portfolio.verifyHistory(tx, userId);
      return { id, status: 'SETTLED', ledgerIds: ids, residualCashIDR: money(residual) };
    });
  }
}
