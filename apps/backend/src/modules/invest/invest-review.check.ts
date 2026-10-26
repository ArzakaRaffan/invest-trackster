import assert = require('node:assert/strict');
import { buildReview, ReviewBaseline, snapshotHash } from './invest-review';
import { EngineInput } from './invest-engine';
import { evaluateProfile } from './invest-profile';
import { INVEST_RULESET } from './invest-budget';

const now = new Date('2026-10-31T16:59:59.999Z');
const goal = { id: 'goal', version: 1, needDate: '2039-01-01', liquidityDays: 7, holdingsDeclaration: 'ENTERED' };
const profile = evaluateProfile({ goal, now, cashValid: true, confirmedAt: now, answers: { t1: 3, t2: 3, t3: 3, t4: 3, essentialExpenseIDR: '100', liquidReserveIDR: '1200', lossCapacityIDR: '1000000', incomeStable: true, urgentObligations: false, nearTermNeed: false, hasDeficit: false, expensiveDebt: false, k1: 'TRUE', k2: 'TRUE', k3: 'TRUE' } });
const input: EngineInput = { now, mode: 'ACTUAL', budgetIDR: '999999.99', goal, profile, cashInGoalIDR: '0', instruments: [], access: [], peers: [], globalEnabled: false, cryptoEnabled: false, reasons: [], holdings: [
  { id: 'c', assetClass: 'CASH', valueIDR: '100', instrumentId: null, reasons: [] },
  { id: 'b', assetClass: 'BONDS', valueIDR: '300', instrumentId: null, reasons: [] },
  { id: 'e', assetClass: 'EQUITY', valueIDR: '600', instrumentId: null, reasons: [] },
] };
const budget = { actualQuota: '1000000.00', plannedQuota: null, availableToAllocate: '999999.99' };
const baseline: ReviewBaseline = { id: 'eval', month: '2026-10', ruleset: INVEST_RULESET, inputRevision: 'one', catalogRevision: 'catalog1', input: { engine: 'engine1', input, profileId: 'p1', goalVersion: 1, budget }, result: { targets: ['0.1','0.3','0.6','0'] } };
const current = { input, budget, revision: 'one', catalogRevision: 'catalog1', profileId: 'p1', goalVersion: 1, engine: 'engine1' };
let checks = 0;
const eq = (a: unknown, b: unknown, why: string) => { assert.deepEqual(a,b,why); checks++; };
eq(snapshotHash({ a: 1, b: { x: 2, y: 3 } }), snapshotHash({ b: { y: 3, x: 2 }, a: 1 }), 'JSONB ordering irrelevant');
const same = buildReview(baseline, current);
eq(same.reasons, [], 'unchanged state has no fabricated triggers');
eq(same.potIDR, '1000.00', 'large uncommitted budget excluded from existing pot');
eq(same.drift.map(d => d.deltaPP), ['0.0000','0.0000','0.0000','0.0000'], 'target-aligned current pot');
eq(buildReview(baseline, { ...current, input: { ...input, now: new Date(now.getTime() - 1000) } }).reviewKey, same.reviewKey, 'no per-second acknowledgment churn');
const nextMonth = buildReview(baseline, { ...current, input: { ...input, now: new Date(now.getTime() + 1) } });
eq(nextMonth.reasons.includes('MONTHLY_REVIEW'), true, 'WIB month rollover, not UTC midnight');
eq(nextMonth.reviewKey !== same.reviewKey, true, 'new month requires new acknowledgment');
for (const [amount, triggers] of [['649.99', false], ['650', true], ['650.01', true]] as const) {
  const holdings = structuredClone(input.holdings); holdings[2].valueIDR = amount; holdings[0].valueIDR = String(1000 - 300 - Number(amount));
  const result = buildReview(baseline, { ...current, input: { ...input, holdings } });
  eq(result.reasons.includes('DRIFT_5PP'), triggers, 'exact5pp trigger before display rounding');
  eq(result.drift.find(d => d.assetClass === 'EQUITY')!.triggered, triggers, 'per-class drift flag');
}
const missing = structuredClone(input.holdings); missing[2].valueIDR = null;
eq(buildReview(baseline, { ...current, input: { ...input, holdings: missing } }).drift, [], 'missing valuation never treated as zero');
eq(buildReview(baseline, { ...current, input: { ...input, holdings: missing } }).potIDR, null, 'incomplete total withheld');
const stale = structuredClone(input.holdings); stale[2].reasons = ['FX_STALE'];
eq(buildReview(baseline, { ...current, input: { ...input, holdings: stale } }).driftState, 'VALUATION_REQUIRED', 'stale valuation blocks ratios');
eq(buildReview(baseline, { ...current, goalVersion: 2 }).driftState, 'TARGET_REQUIRED', 'changed goal must not compare against stale target');
eq(buildReview(baseline, { ...current, profileId: 'p2' }).targetChanged, true, 'new profile version prompts review');
eq(buildReview(baseline, { ...current, engine: 'engine2' }).targetChanged, true, 'method implementation changes invalidate target');
eq(buildReview(baseline, { ...current, catalogRevision: 'catalog2' }).reasons.includes('SOURCE_CHANGED'), true, 'source changes prompt review');
eq(buildReview(baseline, { ...current, budget: { ...budget, plannedQuota: '0.00' } }).reasons.includes('BUDGET_CHANGED'), true, 'unknown and zero remain distinct');
eq(buildReview(baseline, { ...current, input: { ...input, holdings: [], cashInGoalIDR: '0', goal: { ...goal, holdingsDeclaration: 'EMPTY' } } }).driftState, 'EMPTY_POT', 'empty pot has no invented proportions');
eq(buildReview(baseline, { ...current, input: { ...input, holdings: [] } }).driftState, 'VALUATION_REQUIRED', 'declared holdings missing is not empty');
eq(buildReview(baseline, { ...current, input: { ...input, cashInGoalIDR: '1000' } }).potIDR, '2000.00', 'realized goal cash included once');
eq(buildReview(baseline, { ...current, input: { ...input, profile: null } }).reasons.includes('PROFILE_REVIEW'), true, 'unavailable or expired profile requires review');
console.log(`PASS ${checks} review assertions (synthetic boundaries, not calibration)`);
