import { fingerprint, InvestDecimal as D, INVEST_RULESET, money } from './invest-budget';
import { ASSETS, eligibility, EngineInput } from './invest-engine';
import { wibDateKey } from '../../common/wib';

export const REVIEW_VERSION = 'invest-review-v0.1';
// PostgreSQL JSONB does not retain key order. Hash facts, never their serialization order.
export const snapshotHash = (v: unknown): string => fingerprint(JSON.parse(JSON.stringify(v), (_key, value) => value != null && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value));
type Budget = { actualQuota: string | null; plannedQuota: string | null; availableToAllocate: string | null };
export type ReviewBaseline = {
  id: string; month: string; ruleset: string; inputRevision: string; catalogRevision: string;
  input: { engine: string; input: EngineInput; profileId: string | null; goalVersion: number; budget: Budget };
  result: { targets: string[] };
};
export function buildReview(base: ReviewBaseline, current: { input: EngineInput; budget: Budget; revision: string; catalogRevision: string; profileId: string | null; goalVersion: number; engine: string }) {
  const now = current.input.now, month = wibDateKey(now).slice(0, 7), old = base.input.input;
  const reasons: string[] = [];
  if (base.month !== month) reasons.push('MONTHLY_REVIEW');
  const profileFacts = (p: EngineInput['profile']) => p && [p.riskClass, p.toleranceLossPercent, p.lossCapacityIDR, p.cryptoPercent];
  const targetChanged = base.ruleset !== INVEST_RULESET || base.input.engine !== current.engine || base.input.profileId !== current.profileId || base.input.goalVersion !== current.goalVersion || snapshotHash(profileFacts(old.profile)) !== snapshotHash(profileFacts(current.input.profile));
  if (targetChanged) reasons.push('TARGET_CHANGED');
  if (current.input.profile?.status !== 'READY') reasons.push('PROFILE_REVIEW');
  if (base.catalogRevision !== current.catalogRevision) reasons.push('SOURCE_CHANGED');
  const metrics = (['actualQuota', 'plannedQuota', 'availableToAllocate'] as const).map(key => ({ key, before: base.input.budget[key] ?? null, now: current.budget[key] ?? null }));
  if (metrics.some(m => m.before !== m.now)) reasons.push('BUDGET_CHANGED');
  if (snapshotHash([old.holdings, old.cashInGoalIDR]) !== snapshotHash([current.input.holdings, current.input.cashInGoalIDR])) reasons.push('HOLDINGS_CHANGED');
  const gates = (input: EngineInput) => input.instruments.map(i => [i.id, eligibility(i, input)]);
  if (snapshotHash(gates({ ...old, now: new Date(old.now) })) !== snapshotHash(gates(current.input))) reasons.push('ELIGIBILITY_CHANGED');
  if (base.inputRevision !== current.revision && !reasons.length) reasons.push('INPUT_CHANGED');

  // Drift measures the existing goal pot, never an unspent allowance or a hypothetical order.
  const known = current.input.goal.holdingsDeclaration !== 'UNKNOWN' && !(current.input.goal.holdingsDeclaration === 'ENTERED' && !current.input.holdings.length)
    && current.input.holdings.every(h => h.valueIDR != null && !h.reasons.length) && new D(current.input.cashInGoalIDR).gte(0);
  const values = ASSETS.map(asset => current.input.holdings.filter(h => h.assetClass === asset).reduce((sum, h) => sum.plus(h.valueIDR ?? 0), new D(asset === 'CASH' ? current.input.cashInGoalIDR : 0)));
  const pot = values.reduce((sum, v) => sum.plus(v), new D(0));
  const targetValid = !targetChanged && current.input.profile?.status === 'READY' && base.result.targets.length === 4;
  let driftState: 'AVAILABLE' | 'VALUATION_REQUIRED' | 'TARGET_REQUIRED' | 'EMPTY_POT';
  if (!known) { driftState = 'VALUATION_REQUIRED'; reasons.push('VALUATION_REQUIRED'); }
  else if (pot.isZero()) driftState = 'EMPTY_POT';
  else if (!targetValid) { driftState = 'TARGET_REQUIRED'; reasons.push('TARGET_REQUIRED'); }
  else driftState = 'AVAILABLE';
  const drift = driftState === 'AVAILABLE' ? ASSETS.map((assetClass, index) => {
    const weight = values[index].div(pot), target = new D(base.result.targets[index]), delta = weight.minus(target);
    return { assetClass, valueIDR: money(values[index]), weightPercent: weight.times(100).toFixed(4), targetPercent: target.times(100).toFixed(4), deltaPP: delta.times(100).toFixed(4), triggered: delta.abs().gte('.05') };
  }) : [];
  if (drift.some(d => d.triggered)) reasons.push('DRIFT_5PP');
  const result = { version: REVIEW_VERSION, month, reasons, metrics, driftState, drift, potIDR: known ? money(pot) : null, targetChanged };
  // Time itself is excluded; month, live gate/valuation changes, and revisions invalidate an acknowledgment.
  return { ...result, reviewKey: snapshotHash([result, base.id, current.revision, current.catalogRevision, current.profileId, current.goalVersion, current.engine]) };
}
