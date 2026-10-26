import * as assert from 'node:assert/strict';
import { completeMonths, evaluateProfile, riskHash, RiskAnswers } from './invest-profile';
const now = new Date('2026-10-26T03:00:00Z');
const goal = { id: 'synthetic', version: 1, needDate: '2036-10-26', liquidityDays: 7 };
const a: RiskAnswers = { t1: 3, t2: 3, t3: 3, t4: 3, essentialExpenseIDR: '100', liquidReserveIDR: '600', lossCapacityIDR: '200', incomeStable: true,
  urgentObligations: false, nearTermNeed: false, hasDeficit: false, expensiveDebt: false, k1: 'TRUE', k2: 'TRUE', k3: 'TRUE', cryptoOptIn: false };
const run = (answers: RiskAnswers = a, extra: Partial<Parameters<typeof evaluateProfile>[0]> = {}) => evaluateProfile({ goal, answers, now, cashValid: true, confirmedAt: now, profileGoalVersion: 1, ...extra });
let checks = 0;
function eq(actual: unknown, expected: unknown) { assert.deepEqual(actual, expected); checks++; }
for (let t1 = 0; t1 <= 3; t1++) for (let t2 = 0; t2 <= 3; t2++) for (let t3 = 0; t3 <= 3; t3++) for (let t4 = 0; t4 <= 3; t4++) {
  const s = t1 + t2 + t3 + t4, expectedT = Math.min(t1, s < 3 ? 0 : s < 6 ? 1 : s < 9 ? 2 : 3);
  for (const [reserve, stable, c] of [['299.99', true, 0], ['300', true, 1], ['599.99', true, 1], ['600', false, 2], ['600', true, 3]] as const) {
    for (const [needDate, h] of [['2029-10-25', 0], ['2029-10-26', 1], ['2031-10-25', 1], ['2031-10-26', 2], ['2036-10-25', 2], ['2036-10-26', 3]] as const) {
      const p = run({ ...a, t1, t2, t3, t4, liquidReserveIDR: reserve, incomeStable: stable }, { goal: { ...goal, needDate }, conflictsAcknowledged: true });
      eq(p.riskClass, Math.min(expectedT, c, h)); eq([p.tolerance, p.capacity, p.horizon], [expectedT, c, h]);
    }
  }
}
eq(run({ ...a, essentialExpenseIDR: '0' }).riskClass, null);
eq(run({ ...a, lossCapacityIDR: undefined }).status, 'NEEDS_INPUT');
eq(run({ ...a, t2: undefined }).tolerance, null);
eq(run(a, { cashValid: false }).status, 'NEEDS_INPUT');
eq(run({ ...a, nearTermNeed: true }).capacity, 0);
eq(run({ ...a, expensiveDebt: true }).capacity, 0);
eq(run({ ...a, lossCapacityIDR: '0' }).capacity, 0);
eq(run({ ...a, t1: 0 }).status, 'NEEDS_REVIEW');
eq(run({ ...a, t1: 0 }, { conflictsAcknowledged: true }).riskClass, 0);
eq(run({ ...a, k2: 'FALSE' }).knowledge.bonds, false);
eq(run({ ...a, k1: 'FALSE' }).riskClass, 3); // knowledge gates products; it does not add risk capacity
eq(run({ ...a, k3: 'UNSURE', cryptoOptIn: true, cryptoPercent: '5' }).cryptoPercent, '0.00');
eq(run({ ...a, cryptoOptIn: true, cryptoPercent: '5' }).cryptoPercent, '5.00');
eq(run(a, { confirmedAt: new Date('2025-10-26T00:00:00Z') }).status, 'NEEDS_REVIEW');
eq(run(a, { confirmedAt: new Date('2025-10-27T00:00:00Z') }).status, 'READY');
eq(run(a, { profileGoalVersion: 2 }).status, 'NEEDS_REVIEW');
eq(completeMonths('2024-02-29', '2025-02-28'), 11);
eq(completeMonths('2026-01-31', '2026-02-28'), 0);
eq(completeMonths('2026-10-26', '2020-01-01'), 0);
assert.notEqual(riskHash(goal, a), riskHash({ ...goal, version: 2 }, a)); checks++;
console.log(`invest-profile: ${checks} assertions passed`);
