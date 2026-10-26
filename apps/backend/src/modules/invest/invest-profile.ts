import { wibDateKey } from '../../common/wib';
import { fingerprint, INVEST_RULESET, InvestDecimal, money, validDate } from './invest-budget';

export type RiskAnswers = {
  t1?: number; t2?: number; t3?: number; t4?: number;
  essentialExpenseIDR?: string; liquidReserveIDR?: string; lossCapacityIDR?: string;
  incomeStable?: boolean; urgentObligations?: boolean; nearTermNeed?: boolean; hasDeficit?: boolean; expensiveDebt?: boolean;
  k1?: 'TRUE' | 'FALSE' | 'UNSURE'; k2?: 'TRUE' | 'FALSE' | 'UNSURE'; k3?: 'TRUE' | 'FALSE' | 'UNSURE';
  cryptoOptIn?: boolean; cryptoPercent?: string;
};
export type ProfileGoal = { id: string; version: number; needDate: string | null; liquidityDays: number | null };

/** Whole calendar months, not days / 30 or milliseconds / year. WIB dates only. */
export function completeMonths(from: string, to: string) {
  if (!validDate(from) || !validDate(to)) throw new Error('Invalid calendar date');
  const [fy, fm, fd] = from.split('-').map(Number), [ty, tm, td] = to.split('-').map(Number);
  return Math.max(0, (ty - fy) * 12 + tm - fm - (td < fd ? 1 : 0));
}

export function riskHash(goal: ProfileGoal, a: RiskAnswers) {
  // Canonical field order: acknowledgement cannot be reused with different answers/goal version.
  return fingerprint([INVEST_RULESET, goal.id, goal.version, goal.needDate, goal.liquidityDays,
    a.t1, a.t2, a.t3, a.t4, a.essentialExpenseIDR, a.liquidReserveIDR, a.lossCapacityIDR,
    a.incomeStable, a.urgentObligations, a.nearTermNeed, a.hasDeficit, a.expensiveDebt,
    a.k1, a.k2, a.k3, a.cryptoOptIn, a.cryptoPercent]);
}

export function evaluateProfile(input: {
  goal: ProfileGoal; answers: RiskAnswers; now: Date; cashValid: boolean;
  confirmedAt?: Date | null; profileGoalVersion?: number; conflictsAcknowledged?: boolean;
}) {
  const { goal, answers: a, now } = input;
  const D = InvestDecimal;
  const missing: string[] = [], reasons: string[] = [], conflicts: string[] = [];
  const ts = [a.t1, a.t2, a.t3, a.t4];
  ts.forEach((t, i) => { if (!Number.isInteger(t) || t! < 0 || t! > 3) missing.push(`T${i + 1}`); });
  const tolerance = missing.length ? null : Math.min(a.t1!, Math.floor(ts.reduce<number>((s, t) => s + t!, 0) / 3), 3);
  // M2's explicit example generalized only to the same contradictory responses (T2 / T4).
  if (a.t1 === 0 && (a.t2 === 3 || a.t4 === 3)) conflicts.push('LOSS_RESPONSE_CONFLICT');
  for (const k of ['essentialExpenseIDR', 'liquidReserveIDR', 'lossCapacityIDR'] as const) {
    if (typeof a[k] !== 'string' || !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(a[k]!)) missing.push(k);
  }
  for (const k of ['incomeStable', 'urgentObligations', 'nearTermNeed', 'hasDeficit', 'expensiveDebt'] as const) if (typeof a[k] !== 'boolean') missing.push(k);
  let capacity: number | null = null, reserveMonths: string | null = null;
  if (!missing.some(k => !/^T\d$/.test(k))) {
    const essential = new D(a.essentialExpenseIDR!);
    if (essential.lte(0)) missing.push('essentialExpenseIDR');
    else {
      const reserve = new D(a.liquidReserveIDR!).div(essential);
      reserveMonths = reserve.toFixed(4);
      const blocked = a.urgentObligations || a.nearTermNeed || a.hasDeficit || a.expensiveDebt;
      capacity = blocked || new D(a.lossCapacityIDR!).isZero() || reserve.lt(3) ? 0 : reserve.lt(6) ? 1 : a.incomeStable ? 3 : 2;
      if (blocked) reasons.push('ESSENTIAL_NEEDS_FIRST');
      if (reserve.lt(3)) reasons.push('RESERVE_BELOW_THREE_MONTHS');
      if (new D(a.lossCapacityIDR!).isZero()) reasons.push('NO_LOSS_CAPACITY');
    }
  }
  let horizon: number | null = null, horizonMonths: number | null = null;
  if (!goal.needDate || !validDate(goal.needDate)) missing.push('needDate');
  else {
    horizonMonths = completeMonths(wibDateKey(now), goal.needDate);
    horizon = horizonMonths < 36 ? 0 : horizonMonths < 60 ? 1 : horizonMonths < 120 ? 2 : 3;
  }
  if (goal.liquidityDays == null) missing.push('liquidityDays');
  for (const k of ['k1', 'k2', 'k3'] as const) if (!['TRUE', 'FALSE', 'UNSURE'].includes(a[k]!)) missing.push(k);
  if (!input.cashValid) missing.push('cashConfirmation');
  const expired = !!input.confirmedAt && completeMonths(wibDateKey(input.confirmedAt), wibDateKey(now)) >= 12;
  if (expired) reasons.push('PROFILE_EXPIRED');
  if (input.profileGoalVersion != null && input.profileGoalVersion !== goal.version) reasons.push('GOAL_CHANGED');
  if (!input.confirmedAt) reasons.push('ANSWERS_NOT_CONFIRMED');
  if (conflicts.length && !input.conflictsAcknowledged) reasons.push('CONFLICT_REVIEW_REQUIRED');
  const riskClass = tolerance == null || capacity == null || horizon == null || missing.length ? null : Math.min(tolerance, capacity, horizon);
  const knowledge = { diversification: a.k1 === 'TRUE', bonds: a.k1 === 'TRUE' && a.k2 === 'TRUE', fxCrypto: a.k1 === 'TRUE' && a.k3 === 'TRUE' };
  const requestedCrypto = new D(a.cryptoPercent ?? 0);
  const cryptoPercent = a.cryptoOptIn && riskClass === 3 && knowledge.fxCrypto ? D.min(5, D.max(0, requestedCrypto)).toFixed(2) : '0.00';
  return { status: missing.length ? 'NEEDS_INPUT' : reasons.some(r => ['PROFILE_EXPIRED', 'GOAL_CHANGED', 'ANSWERS_NOT_CONFIRMED', 'CONFLICT_REVIEW_REQUIRED'].includes(r)) ? 'NEEDS_REVIEW' : 'READY',
    riskClass, tolerance, capacity, horizon, horizonMonths, reserveMonths, knowledge, cryptoPercent,
    lossCapacityIDR: a.lossCapacityIDR == null ? null : money(a.lossCapacityIDR), toleranceLossPercent: a.t1 == null ? null : [0, 10, 20, 35][a.t1],
    missing: [...new Set(missing)], reasons, conflicts, reviewHash: riskHash(goal, a), ruleset: INVEST_RULESET };
}
