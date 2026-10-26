import { Prisma } from '@prisma/client';
type Dec = Prisma.Decimal;
type Value = Prisma.Decimal.Value;
import { InvestDecimal as D, money } from './invest-budget';
import { Asset, InvestFactsDto, InvestPeerDto } from './invest-market.dto';
import { evaluateProfile } from './invest-profile';
import { wibDateKey } from '../../common/wib';

export type Instrument = { id: string; version: number; facts: InvestFactsDto };
export type Access = { instrumentId: string; instrumentVersion: number; status: string; understood: boolean; acceptsLock: boolean; reviewedAt: Date | string };
export type Profile = ReturnType<typeof evaluateProfile>;
export type PotHolding = { id: string; assetClass: Asset; valueIDR: string | null; instrumentId: string | null; reasons: string[] };
export type Order = { instrumentId: string; instrumentVersion: number; name: string; assetClass: Asset; peer: string; quantity: string; principalIDR: string; feeIDR: string; totalIDR: string; indicative: boolean; asOf: string };
export type EngineInput = { now: Date; mode: 'PLAN' | 'ACTUAL'; budgetIDR: string | null; profile: Profile | null; goal: { needDate: string | null; liquidityDays: number | null; holdingsDeclaration: string };
  holdings: PotHolding[]; cashInGoalIDR: string; instruments: Instrument[]; access: Access[]; peers: InvestPeerDto[]; selections?: { assetClass: Asset; instrumentId: string }[]; globalEnabled: boolean; cryptoEnabled: boolean; reasons: string[] };
export const ASSETS: Asset[] = ['CASH', 'BONDS', 'EQUITY', 'CRYPTO'];
const TEMPLATES = [[1, 0, 0, 0], [.6, .3, .1, 0], [.3, .4, .3, 0], [.1, .3, .6, 0]];
export const SHOCKS = [[0, .15, .50, 1], [0, .20, .20, .70], [0, .15, .60, 1]];
const sum = (values: Value[]) => values.reduce<Dec>((s, v) => s.plus(v), new D(0));
const maxLoss = (values: Value[]) => D.max(0, ...values);
const age = (now: Date, value: Date | string | undefined) => value == null ? Infinity : now.getTime() - new Date(value).getTime();
const fresh = (now: Date, value: Date | string | undefined, ms: number) => { const a = age(now, value); return Number.isFinite(a) && a >= 0 && a <= ms; };
export const peerKey = (f: InvestFactsDto) => [f.kind, f.assetClass, f.exposure.trim().toLowerCase(), f.currency, f.tenorBand].join('|');

/** Counts explicit completed source sessions; never treats weekends as an exchange calendar. */
export function quoteReasons(f: InvestFactsDto, now: Date) {
  const q = f.quote, r: string[] = [];
  if (!q || new D(q.price).lte(0) || new D(q.fxToIDR).lte(0)) return ['QUOTE_MISSING'];
  if (age(now, q.asOf) < 0 || age(now, q.fetchedAt) < 0 || new Date(q.asOf) > new Date(q.fetchedAt)) r.push('QUOTE_TIME_INVALID');
  if (f.currency === 'IDR' && !new D(q.fxToIDR).eq(1)) r.push('FX_INVALID');
  if (f.currency !== 'IDR' && !fresh(now, q.fxAsOf, 86400000)) r.push('FX_STALE');
  if (f.kind === 'CRYPTO' || f.kind === 'CONTRACTUAL') {
    if (!fresh(now, q.asOf, 86400000)) r.push('QUOTE_STALE');
  } else {
    const from = new Date(q.calendarFrom ?? ''), through = new Date(q.calendarThrough ?? '');
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(through.getTime()) || from > new Date(q.asOf) || through < now || !q.sessionCloses.length) r.push('CALENDAR_UNKNOWN');
    else {
      if (q.sessionCloses.some(t => new Date(t) < from || new Date(t) > through)) r.push('CALENDAR_INVALID');
      const elapsed = q.sessionCloses.filter(t => new Date(t) > new Date(q.asOf) && new Date(t) <= now).length;
      if (elapsed > (f.kind === 'FUND' ? 3 : 2)) r.push('QUOTE_STALE');
    }
  }
  return r;
}

export function historyComplete(f: InvestFactsDto, now: Date) {
  const h = f.history;
  if (!h || h.observedSessions > h.expectedSessions || new D(h.observedSessions).div(h.expectedSessions).lt('.95')) return false;
  const [y, m] = wibDateKey(now).slice(0, 7).split('-').map(Number);
  const expected = Array.from({ length: 36 }, (_, i) => { const d = new Date(Date.UTC(y, m - 2 - i, 1)); return d.toISOString().slice(0, 7); });
  return h.months.length === 36 && expected.every(month => h.months.includes(month));
}

export function eligibility(instrument: Instrument, input: EngineInput) {
  const f = instrument.facts, p = input.profile, a = input.access.find(a => a.instrumentId === instrument.id), now = input.now;
  const r: string[] = [];
  if (!f.reviewed || !f.identityVerified) r.push('IDENTITY_REVIEW');
  if (f.lifecycle !== 'OPEN' || (f.purchaseUntil && new Date(f.purchaseUntil) < now)) r.push('PURCHASE_CLOSED');
  if (!fresh(now, f.reviewedAt, 90 * 86400000) || !f.validUntil || new Date(f.validUntil) < now) r.push('METADATA_STALE');
  if (!f.sources.length || f.sources.some(s => s.rights !== 'PERMITTED' || !s.store || !s.display || !s.analyze || !s.rightsEvidence.trim())) r.push('SOURCE_RIGHTS');
  if (!a || a.instrumentVersion !== instrument.version || !['ACTIVE', 'FUNDING_REQUIRED'].includes(a.status) || !a.understood || !fresh(now, a.reviewedAt, 90 * 86400000)) r.push('ACCESS_UNVERIFIED');
  if (f.region === 'GLOBAL' && !input.globalEnabled || f.region === 'CRYPTO' && !input.cryptoEnabled) r.push('REGION_RESEARCH_ONLY');
  if (!p || p.status !== 'READY' || p.riskClass == null) r.push('PROFILE_NOT_READY');
  else {
    if (p.riskClass === 0 || f.minimumRiskClass == null || p.riskClass < f.minimumRiskClass) r.push('RISK_CLASS');
    if (!p.knowledge.diversification || f.assetClass === 'BONDS' && !p.knowledge.bonds || (f.currency !== 'IDR' || f.assetClass === 'CRYPTO') && !p.knowledge.fxCrypto) r.push('KNOWLEDGE');
    if (f.assetClass === 'CRYPTO' && (p.riskClass !== 3 || new D(p.cryptoPercent).lte(0))) r.push('CRYPTO_NOT_OPTED_IN');
  }
  if (f.kind === 'STOCK' || f.assetClass === 'CASH') r.push('NOT_AUTOMATIC_CORE');
  if (f.assetClass === 'EQUITY' && (!f.diversificationVerified || f.diversification < 75)) r.push('CORE_DIVERSIFICATION');
  if (f.payoutDays == null || input.goal.liquidityDays == null || f.payoutDays > input.goal.liquidityDays) r.push('LIQUIDITY');
  if (f.locked && (!a?.acceptsLock || !f.maturityDate || !input.goal.needDate || f.maturityDate > input.goal.needDate)) r.push('MATURITY_LOCK');
  if (f.maturityDate && f.maturityDate <= wibDateKey(now)) r.push('MATURED');
  if (!f.fees || f.minimumIDR == null || !f.unitStep || new D(f.unitStep).lte(0)) r.push('COST_MINIMUM_UNKNOWN');
  if (f.fees && new D(f.fees.fxRoundTripRate).lt(f.fees.fxBuyRate)) r.push('FX_COST_INVALID');
  r.push(...quoteReasons(f, now));
  if (f.kind === 'CONTRACTUAL') { if (!f.contractVerified || !f.exitVerified || !f.maturityDate) r.push('CONTRACT_INCOMPLETE'); }
  else if (!historyComplete(f, now)) r.push('HISTORY_INCOMPLETE');
  if (!f.stressLosses || !f.stressEvidence.trim()) r.push('PRODUCT_STRESS_UNKNOWN');
  return [...new Set(r)];
}

export function splitCents(total: string, proportions: Value[]) {
  const cents = new D(total).times(100).floor(), weight = sum(proportions);
  if (weight.isZero()) return ['0.00', '0.00', '0.00', '0.00'];
  const exact = proportions.map(p => new D(p).div(weight).times(cents));
  const base = exact.map(x => x.floor());
  const remainder = cents.minus(sum(base)).toNumber();
  const order = exact.map((v, i) => ({ i, fraction: v.minus(base[i]) })).sort((a, b) => b.fraction.comparedTo(a.fraction) || a.i - b.i);
  for (let n = 0; n < remainder; n++) base[order[n].i] = base[order[n].i].plus(1);
  return base.map(v => v.div(100).toFixed(2));
}

/** Monotone binary search on lot counts; Decimal rounding up prevents a fractional-cent overspend. */
export function fitOrder(i: Instrument, budget: string): Order | null {
  const f = i.facts, q = f.quote, fees = f.fees;
  if (!q || !fees || !f.unitStep || !f.minimumIDR || new D(f.unitStep).lte(0) || new D(q.price).lte(0) || new D(q.fxToIDR).lte(0)) return null;
  const step = new D(f.unitStep), price = new D(q.price).times(q.fxToIDR), b = new D(budget);
  const priceOf = (lots: Dec) => {
    const quantity = lots.times(step), principal = quantity.times(price).toDecimalPlaces(2, D.ROUND_CEIL);
    const fee = principal.times(new D(fees.buyRate).plus(fees.fxBuyRate)).plus(fees.buyFixedIDR).toDecimalPlaces(2, D.ROUND_CEIL);
    return { quantity, principal, fee, total: principal.plus(fee) };
  };
  let lo = new D(0), hi = b.div(price.times(step)).floor();
  while (lo.lt(hi)) { const mid = lo.plus(hi).plus(1).div(2).floor(); if (priceOf(mid).total.lte(b)) lo = mid; else hi = mid.minus(1); }
  const o = priceOf(lo);
  if (lo.lte(0) || o.quantity.gte('10000000000000000') || o.principal.lt(f.minimumIDR) || o.fee.div(o.total).gt('.01')) return null;
  return { instrumentId: i.id, instrumentVersion: i.version, name: f.name, assetClass: f.assetClass, peer: peerKey(f), quantity: o.quantity.toFixed(12), principalIDR: money(o.principal), feeIDR: money(o.fee), totalIDR: money(o.total), indicative: q.indicative, asOf: q.asOf };
}

function annualCost(f: InvestFactsDto, o: Order, horizonMonths: number) {
  const c = f.fees!, principal = new D(o.principalIDR);
  // fxRoundTripRate already includes buy FX; do not count fxBuyRate twice.
  const roundTrip = principal.times(new D(c.buyRate).plus(c.exitRate).plus(c.fxRoundTripRate)).plus(c.buyFixedIDR).plus(c.exitFixedIDR);
  return new D(c.ongoingAnnual).plus(c.custodyAnnual).plus(roundTrip.div(principal).div(new D(horizonMonths).div(12)));
}
export function scoreOrder(i: Instrument, o: Order, input: EngineInput, pot: Dec) {
  const f = i.facts, h = f.history, annual = annualCost(f, o, input.profile!.horizonMonths!);
  const cap = f.kind === 'CONTRACTUAL' ? '.02' : f.kind === 'CRYPTO' ? '.05' : '.03';
  const COST = D.max(0, new D(1).minus(annual.div(cap))).times(100);
  let DIV = f.diversificationVerified ? f.diversification : 0;
  if (f.kind === 'CONTRACTUAL') {
    const issuerValue = sum(input.holdings.filter(v => input.instruments.find(x => x.id === v.instrumentId)?.facts.issuer === f.issuer).map(v => v.valueIDR ?? 0)).plus(o.principalIDR);
    const exposure = issuerValue.div(pot);
    DIV = exposure.lte('.1') ? 100 : exposure.lte('.25') ? 75 : exposure.lte('.5') ? 50 : 25;
  }
  const second = h?.secondPrice && h.secondAsOf && h.secondSource && f.sources.some(s => s.url === h.secondSource) && f.sources.some(s => s.url !== h.secondSource)
    && Math.abs(new Date(h.secondAsOf).getTime() - new Date(f.quote!.asOf).getTime()) <= 300000
    && new D(h.secondPrice).minus(f.quote!.price).abs().div(f.quote!.price).lte(f.kind === 'FUND' ? '.005' : '.01');
  const DATA = f.kind === 'CONTRACTUAL'
    ? [f.contractVerified, !!f.fees && f.minimumIDR != null && !!f.maturityDate, f.identityVerified, f.exitVerified && f.sources.length >= 2].filter(Boolean).length * 25
    : [historyComplete(f, input.now), h?.adjustedReconciled, h?.identityCalendarVerified, second].filter(Boolean).length * 25;
  const LIQ = f.payoutDays! <= 1 ? 100 : f.payoutDays! <= 2 ? 80 : f.payoutDays! <= 7 ? 60 : f.payoutDays! <= 30 ? 20 : 0;
  const ACCESS = input.access.find(a => a.instrumentId === i.id)?.status === 'ACTIVE' ? 100 : 80;
  const score = COST.times('.30').plus(new D(DIV).times('.20')).plus(new D(DATA).times('.20')).plus(new D(LIQ).times('.15')).plus(new D(ACCESS).times('.15'));
  return { instrumentId: i.id, name: f.name, peer: peerKey(f), assetClass: f.assetClass, score: score.toFixed(6), displayScore: score.toFixed(1), annualCost: annual.toString(),
    features: { COST: COST.toFixed(6), DIV, DATA, LIQ, ACCESS }, asOf: f.quote!.asOf, nearTie: false, order: o };
}
export type Ranked = ReturnType<typeof scoreOrder>;
export function rank(candidates: Ranked[]) {
  return [...candidates].sort((a, b) => new D(b.score).comparedTo(a.score) || new D(a.annualCost).comparedTo(b.annualCost) || (new Date(b.asOf).getTime() - new Date(a.asOf).getTime()) || (a.instrumentId < b.instrumentId ? -1 : a.instrumentId > b.instrumentId ? 1 : 0))
    .slice(0, 3).map((c, _, list) => ({ ...c, nearTie: list.some(other => other.instrumentId !== c.instrumentId && new D(other.score).minus(c.score).abs().lt(3)) }));
}

function losses(asset: Asset, i?: Instrument) { const n = ASSETS.indexOf(asset); return SHOCKS.map((s, k) => D.max(s[n], i?.facts.stressLosses?.[k] ?? 0)); }
function initialPot(input: EngineInput) { return sum(input.holdings.map(h => h.valueIDR ?? 0)).plus(input.cashInGoalIDR); }
function scenarioLosses(input: EngineInput, orders: Order[] = []) {
  const values = [new D(0), new D(0), new D(0)];
  for (const h of input.holdings) losses(h.assetClass, input.instruments.find(i => i.id === h.instrumentId)).forEach((l, k) => { values[k] = values[k].plus(l.times(h.valueIDR ?? 0)); });
  for (const o of orders) losses(o.assetClass, input.instruments.find(i => i.id === o.instrumentId)).forEach((l, k) => { values[k] = values[k].plus(l.times(o.principalIDR)); });
  return values;
}
export function checkFullPot(input: EngineInput, orders: Order[], budget: string) {
  const p = input.profile!, pot = initialPot(input).plus(budget), fees = sum(orders.map(o => o.feeIDR));
  const limit = D.min(p.lossCapacityIDR ?? 0, pot.times(new D(p.toleranceLossPercent ?? 0).div(100)));
  const scenarios = scenarioLosses(input, orders).map(l => l.plus(fees));
  const crypto = sum(input.holdings.filter(h => h.assetClass === 'CRYPTO').map(h => h.valueIDR ?? 0)).plus(sum(orders.filter(o => o.assetClass === 'CRYPTO').map(o => o.principalIDR)));
  const cryptoLimitPassed = crypto.lte(pot.minus(fees).times(new D(p.cryptoPercent).div(100)));
  return { passed: maxLoss(scenarios).lte(limit) && cryptoLimitPassed, cryptoLimitPassed, potIDR: money(pot), feesIDR: money(fees), limitIDR: money(limit), scenarioLossIDR: scenarios.map(money), worstLossIDR: money(maxLoss(scenarios)) };
}

export function evaluateInvest(input: EngineInput) {
  const p = input.profile, reasons = [...input.reasons], budget = input.budgetIDR == null ? null : new D(input.budgetIDR);
  if (!p || p.status !== 'READY') reasons.push('PROFILE_NOT_READY');
  if (input.goal.holdingsDeclaration === 'UNKNOWN' || input.goal.holdingsDeclaration === 'ENTERED' && !input.holdings.length) reasons.push('HOLDINGS_UNKNOWN');
  if (budget == null) reasons.push('BUDGET_UNKNOWN');
  if (budget?.lte(0)) reasons.push('NO_BUDGET');
  if (new D(input.cashInGoalIDR).lt(0)) reasons.push('GOAL_CASH_INVALID');
  for (const h of input.holdings) {
    if (h.valueIDR == null || h.reasons.length) reasons.push('HOLDING_VALUATION_REQUIRED');
    if ((h.assetClass !== 'CASH' || h.instrumentId != null) && new D(h.valueIDR ?? 0).gt(0)) {
      const i = input.instruments.find(i => i.id === h.instrumentId);
      if (!i || !i.facts.stressLosses || !i.facts.stressEvidence.trim() || !i.facts.reviewed || !fresh(input.now, i.facts.reviewedAt, 90 * 86400000) || !i.facts.validUntil || new Date(i.facts.validUntil) < input.now) reasons.push('HOLDING_MAPPING_REQUIRED');
    }
  }
  const gates = input.instruments.map(i => ({ instrumentId: i.id, name: i.facts.name, peer: peerKey(i.facts), assetClass: i.facts.assetClass, reasons: eligibility(i, input) }));
  const empty = { budgetIDR: budget == null ? null : money(budget), targets: [] as string[], groupBudgets: [] as string[], groups: [] as { peer: string; assetClass: Asset; candidates: Ranked[] }[], orders: [] as Order[], residualCashIDR: budget == null ? null : money(budget), gates, stress: null as ReturnType<typeof checkFullPot> | null, scaledBy: null as string | null, overlap: 'UNKNOWN' };
  if (reasons.length) return { ...empty, status: 'WITHHELD', reasons: [...new Set(reasons)] };
  const pot = initialPot(input).plus(budget!);
  if (pot.lte(0)) return { ...empty, status: 'WITHHELD', reasons: ['EMPTY_POT'] };
  const weights = TEMPLATES[p!.riskClass!].map(v => new D(v));
  const crypto = new D(p!.cryptoPercent).div(100);
  weights[2] = weights[2].minus(crypto); weights[3] = crypto;
  const worst = maxLoss(SHOCKS.map(s => sum(s.map((v, j) => weights[j].times(v)))));
  const limit = D.min(new D(p!.toleranceLossPercent!).div(100), new D(p!.lossCapacityIDR!).div(pot));
  const scale = worst.gt(0) ? D.min(1, limit.div(worst)) : new D(1);
  for (let j = 1; j < 4; j++) weights[j] = weights[j].times(scale);
  weights[0] = new D(1).minus(sum(weights.slice(1)));
  const initial = initialPot(input);
  const oldLimit = D.min(new D(p!.toleranceLossPercent!).div(100).times(initial), p!.lossCapacityIDR!);
  const oldCrypto = sum(input.holdings.filter(h => h.assetClass === 'CRYPTO').map(h => h.valueIDR ?? 0));
  const oldRisky = maxLoss(scenarioLosses(input)).gt(oldLimit) || oldCrypto.gt(initial.times(crypto));
  const values = ASSETS.map(a => sum(input.holdings.filter(h => h.assetClass === a).map(h => h.valueIDR ?? 0)).plus(a === 'CASH' ? input.cashInGoalIDR : 0));
  const deficits = weights.map((w, j) => j === 0 ? new D(0) : D.max(0, w.times(pot).minus(values[j])));
  const noncash = sum(deficits), spend = D.min(budget!, noncash);
  const allocation = deficits.map((d, j) => j === 0 ? budget!.minus(spend) : noncash.isZero() ? new D(0) : spend.times(d).div(noncash));
  const groupBudgets = splitCents(money(budget!), allocation);
  const result = { ...empty, targets: weights.map(w => w.toFixed(18)), groupBudgets, scaledBy: scale.toFixed(18) };
  if (oldRisky) return { ...result, stress: checkFullPot(input, [], money(budget!)), status: 'WITHHELD', reasons: ['EXISTING_POT_REVIEW'] };
  const scored: Ranked[] = [];
  for (const gate of gates) {
    if (gate.reasons.length) continue;
    const i = input.instruments.find(i => i.id === gate.instrumentId)!, b = groupBudgets[ASSETS.indexOf(i.facts.assetClass)];
    const order = fitOrder(i, b);
    if (!order) { gate.reasons.push('MINIMUM_OR_FEE'); continue; }
    scored.push(scoreOrder(i, order, input, pot));
  }
  const groups = [...new Set(scored.map(c => c.peer))].sort().map(peer => ({ peer, assetClass: scored.find(c => c.peer === peer)!.assetClass, candidates: rank(scored.filter(c => c.peer === peer)) }));
  const orders: Order[] = [];
  for (let j = 1; j < 4; j++) {
    if (new D(groupBudgets[j]).isZero()) continue;
    const peers = groups.filter(g => g.assetClass === ASSETS[j]), selected = input.peers.find(x => x.assetClass === ASSETS[j]);
    const chosen = selected ? peers.find(g => g.peer === selected.peer) : peers.length === 1 ? peers[0] : null;
    if (!chosen) { reasons.push(peers.length > 1 ? 'PEER_SELECTION_REQUIRED' : 'NO_ELIGIBLE_' + ASSETS[j]); continue; }
    // Alternatives are never silently added together. Only one core candidate per class.
    const selection = input.selections?.find(x => x.assetClass === ASSETS[j]);
    const candidate = selection ? chosen.candidates.find(c => c.instrumentId === selection.instrumentId) : chosen.candidates[0];
    if (!candidate) { reasons.push('CANDIDATE_SELECTION_INVALID'); continue; }
    orders.push(candidate.order);
  }
  const stress = checkFullPot(input, orders, money(budget!));
  if (!stress.passed) return { ...result, groups, stress, status: 'WITHHELD', reasons: ['FULL_POT_STRESS'] };
  const residual = budget!.minus(sum(orders.map(o => o.totalIDR)));
  return { ...result, groups, orders, residualCashIDR: money(residual), stress,
    status: input.mode === 'PLAN' ? 'PLAN_ONLY' : orders.length ? reasons.length ? 'PARTIAL' : 'READY' : p!.riskClass === 0 ? 'CASH_ONLY' : 'WITHHELD', reasons };
}
