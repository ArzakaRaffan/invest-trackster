import * as assert from 'assert';
import { Income, IncomeStream, Prisma } from '@prisma/client';
import { buildBudget, estimateStream, money, monthBounds, paymentDates, PaymentEvent, receiptRevision, validDate } from './invest-budget';
import { hasInvestAccess } from './invest-access.guard';

const D = Prisma.Decimal;
const at = (s: string) => new Date(s);
const stream = (overrides: Partial<IncomeStream> = {}): IncomeStream => ({ id: 1, userId: 10, name: 'Synthetic monthly salary', kind: 'FIXED', cadence: 'MONTHLY', source: 'BCA', payDayOfWeek: null, payDayOfMonth: 25, amount: new D('1000.03'), sessionRate: null, sessionExtra: null, maxUnits: null, deductionPerUnit: null, typicalUnits: null, matchKeywords: [], isActive: true, createdAt: at('2025-01-01Z'), ...overrides });
const receipt = (overrides: Partial<Income> = {}): Income => ({ id: 1, userId: 10, amount: new D('1000.03'), description: 'Synthetic receipt', source: 'BCA', receivedAt: at('2026-10-25T12:00:00+07:00'), createdAt: at('2026-10-25T12:00:00+07:00'), streamId: 1, periodStart: at('2026-10-01Z'), units: null, extraUnits: null, status: 'CONFIRMED', origin: 'MANUAL', externalId: null, balanceApplied: false, ...overrides });
const now = at('2026-10-26T12:00:00+07:00');
const input = { month: '2026-10', now, streams: [stream()], receipts: [] as Income[], overrides: [] as PaymentEvent[], cash: null, financialRevision: 'f1' };
let checks = 0;
function eq(a: unknown, b: unknown) { assert.deepStrictEqual(a, b); checks++; }

eq(monthBounds('2026-10').start.toISOString(), '2026-09-30T17:00:00.000Z');
eq(monthBounds('2026-10').end.toISOString(), '2026-10-31T17:00:00.000Z');
eq(validDate('2024-02-29'), true); eq(validDate('2026-02-29'), false); eq(validDate('2026-04-31'), false);
for (const bad of ['2026-00', '2026-13', '2026-1', '2026-10-01', '1900-01', 'x']) { assert.throws(() => monthBounds(bad)); checks++; }
for (let year = 2024; year <= 2028; year++) for (let month = 1; month <= 12; month++) {
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const union = new Set<string>();
  for (let dow = 0; dow < 7; dow++) {
    const dates = paymentDates(ym, stream({ cadence: 'WEEKLY', payDayOfWeek: dow }))!;
    eq(dates.every(d => new Date(`${d}T12:00:00Z`).getUTCDay() === dow), true);
    eq(dates.length >= 4 && dates.length <= 5, true);
    dates.forEach(d => union.add(d));
  }
  eq(union.size, monthBounds(ym).days);
  eq(paymentDates(ym, stream({ payDayOfMonth: 31 })), [`${ym}-${monthBounds(ym).days}`]);
}
eq(paymentDates('2026-10', stream({ cadence: 'WEEKLY', payDayOfWeek: 4 }))!.length, 5);
eq(paymentDates('2026-10', stream({ payDayOfMonth: null })), null);
eq(paymentDates('2026-10', stream({ kind: 'IRREGULAR', cadence: 'NONE' })), []);
const amounts = ['0', '0.01', '0.03', '1.025', '1000.03', '9999999999999999.99'];
eq(amounts.map(money), ['0.00', '0.01', '0.03', '1.03', '1000.03', '9999999999999999.99']);
const boundaries = buildBudget({ ...input, streams: [], receipts: [
  receipt({ id: 1, receivedAt: at('2026-09-30T16:59:59.999Z'), amount: new D(10) }),
  receipt({ id: 2, receivedAt: at('2026-09-30T17:00:00Z'), amount: new D('0.03') }),
  receipt({ id: 3, receivedAt: at('2026-10-31T16:59:59.999Z'), amount: new D(20) }),
  receipt({ id: 4, receivedAt: at('2026-10-31T17:00:00Z'), amount: new D(30) }),
  receipt({ id: 5, status: 'PENDING', amount: new D(50) }),
  receipt({ id: 6, status: 'INTERNAL', amount: new D(60) }),
] });
eq(boundaries.actualIncome, '0.03'); eq(boundaries.actualQuota, '0.01'); eq(boundaries.freeCash, null);
const closed = buildBudget({ ...input, now: at('2026-11-01T00:00:00+07:00'), receipts: [receipt()] });
eq(closed.actualIncome, '1000.03'); eq(closed.expectedIncome, '1000.03'); eq(closed.events[0].status, 'MISSED'); eq(closed.availableToAllocate, null);
const unlinked = buildBudget({ ...input, receipts: [receipt()] });
eq(unlinked.plannedQuota, null); eq(unlinked.events[0].status, 'NEEDS_RECONCILIATION'); eq(unlinked.actualQuota, '200.01');
const pending = buildBudget({ ...input, receipts: [receipt({ status: 'PENDING' })] });
eq(pending.actualQuota, '0.00'); eq(pending.plannedQuota, '200.01');
const event: PaymentEvent = { eventKey: 'stream-1-2026-10-25', originalMonth: '2026-10', scheduledDate: '2026-10-25', streamId: 1, streamName: 'Synthetic monthly salary', expected: '1000.03', conservative: '1000.03', maximum: '1000.03', status: 'PARTIAL', version: 1, reason: 'Synthetic explicit link', links: [{ incomeId: 1, receiptRevision: receiptRevision(receipt({ amount: new D(400) })) }] };
const partial = buildBudget({ ...input, receipts: [receipt({ amount: new D(400) })], overrides: [event] });
eq(partial.expectedIncome, '1000.03'); eq(partial.events[0].received, '400.00'); eq(partial.actualQuota, '80.00');
const complete = buildBudget({ ...input, receipts: [receipt({ amount: new D(400) })], overrides: [{ ...event, status: 'COMPLETED' }] });
eq(complete.expectedIncome, '400.00'); eq(complete.plannedQuota, '80.00');
const changed = buildBudget({ ...input, receipts: [receipt({ amount: new D(450) })], overrides: [event] });
eq(changed.plannedQuota, null); eq(changed.events[0].reasonCodes, ['RECEIPT_CHANGED']);
const deleted = buildBudget({ ...input, overrides: [event] }); eq(deleted.plannedQuota, null);
const cash = { cashAmount: new D(50), cashConfirmedAt: now, financialRevision: 'f1', version: 1 };
eq(buildBudget({ ...input, receipts: [receipt()], cash }).availableToAllocate, '50.00');
eq(buildBudget({ ...input, receipts: [receipt()], cash: { ...cash, cashAmount: new D(1000) } }).availableToAllocate, '200.01');
eq(buildBudget({ ...input, receipts: [receipt()], cash, financialRevision: 'f2' }).status, 'STALE_CASH_CONFIRMATION');
eq(buildBudget({ ...input, receipts: [receipt()], cash, financialRevision: 'f2' }).availableToAllocate, null);
eq(buildBudget({ ...input, cash }).canEvaluate, false);
const noPayday = buildBudget({ ...input, streams: [stream({ payDayOfMonth: null })] }); eq(noPayday.expectedIncome, null);
const noEstimate = buildBudget({ ...input, streams: [stream({ amount: null })] }); eq(noEstimate.expectedIncome, null); eq(noEstimate.reasonCodes, ['MISSING_FORECAST_INPUT']);
eq(buildBudget({ ...input, streams: [stream({ amount: new D(0) })] }).expectedIncome, '0.00');
eq(buildBudget({ ...input, streams: [stream({ kind: 'SESSION', sessionRate: new D(100), maxUnits: 5, typicalUnits: null })] }).expectedIncome, null);
const irregular = buildBudget({ ...input, streams: [stream({ kind: 'IRREGULAR', cadence: 'NONE' })], receipts: [receipt()] }); eq(irregular.plannedQuota, '200.01');
const moved = { ...event, eventKey: 'rescheduled-a', originalMonth: '2026-11', scheduledDate: '2026-11-02', status: 'SCHEDULED' as const, links: [] };
eq(buildBudget({ ...input, overrides: [{ ...event, status: 'CANCELLED', links: [] }, moved] }).expectedIncome, '0.00');
eq(buildBudget({ ...input, month: '2026-11', streams: [stream({ cadence: 'NONE' })], overrides: [moved] }).expectedIncome, '1000.03');
eq(buildBudget({ ...input, receipts: [receipt()], knownLinkedIncomeIds: [1] }).expectedIncome, '2000.06');
eq(buildBudget({ ...input, streams: [], overrides: [event] }).plannedQuota, null);
const unknownStream = buildBudget({ ...input, receipts: [receipt({ streamId: null })] }); eq(unknownStream.plannedQuota, null);
const older = receipt({ receivedAt: at('2026-09-20Z'), createdAt: at('2026-09-20Z'), periodStart: at('2026-09-01Z'), amount: new D(200) });
eq(estimateStream(stream({ kind: 'VARIABLE' }), [older, receipt({ amount: new D(999999) })], monthBounds('2026-10').start).expected, '200.00');
eq(estimateStream(stream({ kind: 'VARIABLE', amount: null }), [older], monthBounds('2026-10').start).complete, true);
for (const [enabled, ids, expected] of [[undefined, undefined, false], ['false', '10', false], ['true', '', false], ['true', '1, 10', true], ['true', '010, 10x', false], ['true', '100', false]] as const) eq(hasInvestAccess(10, enabled, ids), expected);
eq(hasInvestAccess(0, 'true', '0'), false); eq(hasInvestAccess(10, 'TRUE', '10'), false);
console.log(`Invest monthly budget: ${checks} assertions passed (calendar, exact money, reconciliation, source changes, access).`);
