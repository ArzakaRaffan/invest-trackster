import { createHash } from 'crypto';
import { Income, IncomeStream, Prisma } from '@prisma/client';
import { calcStreamForecast } from '../income-forecast/income-forecast.service';
import { wibDateKey } from '../../common/wib';

export const INVEST_RULESET = 'invest-method-v0.1';
// Isolated precision for Decimal(28,12) units/FX. Never change Trackster's global Decimal config.
export const InvestDecimal = Prisma.Decimal.clone({ precision: 60, rounding: Prisma.Decimal.ROUND_HALF_UP });
const D = InvestDecimal;
export const money = (value: Prisma.Decimal.Value) => new D(value).toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
export const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const receiptRevision = (r: Income) => fingerprint([r.id, r.amount.toString(), r.status, r.receivedAt, r.periodStart, r.streamId, r.units, r.extraUnits]);

export function monthBounds(month: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Bulan harus YYYY-MM (2000–2099)');
  const [year, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { start: new Date(`${month}-01T00:00:00+07:00`), end: new Date(Date.UTC(year, m, 1, -7)), days };
}

export function validDate(date: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) return false;
  return Number(date.slice(-2)) <= monthBounds(date.slice(0, 7)).days;
}

export function paymentDates(month: string, stream: Pick<IncomeStream, 'cadence' | 'payDayOfWeek' | 'payDayOfMonth' | 'kind'>): string[] | null {
  const { days } = monthBounds(month);
  if (stream.kind === 'IRREGULAR' || stream.cadence === 'NONE') return [];
  if (stream.cadence === 'MONTHLY') {
    if (stream.payDayOfMonth == null || stream.payDayOfMonth < 1 || stream.payDayOfMonth > 31) return null;
    return [`${month}-${String(Math.min(days, stream.payDayOfMonth)).padStart(2, '0')}`];
  }
  if (stream.payDayOfWeek == null || stream.payDayOfWeek < 0 || stream.payDayOfWeek > 6) return null;
  return Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
    .filter(date => new Date(`${date}T12:00:00Z`).getUTCDay() === stream.payDayOfWeek);
}

export type PaymentEvent = {
  eventKey: string; originalMonth: string; scheduledDate: string; streamId: number; streamName: string;
  expected: string; conservative: string; maximum: string;
  status: 'SCHEDULED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED' | 'MISSED' | 'NEEDS_RECONCILIATION';
  version: number; reason: string;
  links: { incomeId: number; receiptRevision: string }[];
};

/** Reuses Trackster's stream-kind estimator, with a monthly cutoff (no future observations).
 * FIXED and fallback monetary fields retain their exact Decimal source value. */
export function estimateStream(stream: IncomeStream, history: Income[], cutoff: Date) {
  const periods = new Map<string, { amount: Prisma.Decimal; units: Prisma.Decimal }>();
  const floor = new Date(cutoff);
  if (stream.cadence === 'MONTHLY') floor.setUTCMonth(floor.getUTCMonth() - 3);
  else floor.setUTCDate(floor.getUTCDate() - 56);
  for (const row of history) {
    if (row.streamId !== stream.id || row.status !== 'CONFIRMED' || !row.periodStart || row.periodStart >= cutoff || row.receivedAt >= cutoff || row.createdAt >= cutoff || row.periodStart < floor) continue;
    const key = row.periodStart.toISOString();
    const old = periods.get(key) ?? { amount: new D(0), units: new D(0) };
    periods.set(key, { amount: old.amount.plus(row.amount), units: old.units.plus(row.units ?? 0) });
  }
  const ordered = [...periods.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, stream.cadence === 'MONTHLY' ? 3 : 8).map(([, r]) => r);
  const complete = stream.kind === 'FIXED' ? stream.amount != null
    : stream.kind === 'VARIABLE' ? stream.amount != null || ordered.length > 0
    : stream.kind === 'DEDUCTION' ? stream.amount != null && stream.deductionPerUnit != null
    : stream.kind === 'SESSION' ? stream.sessionRate != null && stream.maxUnits != null && (stream.typicalUnits != null || ordered.length >= 3)
    : true;
  const n = (v: Prisma.Decimal | null) => v == null ? null : Number(v);
  const result = calcStreamForecast({ ...stream, amount: n(stream.amount), sessionRate: n(stream.sessionRate), sessionExtra: n(stream.sessionExtra), deductionPerUnit: n(stream.deductionPerUnit), typicalUnits: n(stream.typicalUnits) }, {
    historicalAmounts: ordered.map(r => Number(r.amount)), historicalAbsences: ordered.map(r => Number(r.units)), isScheduledThisWeek: true,
  });
  if (stream.kind === 'FIXED' || (stream.kind === 'VARIABLE' && !ordered.length)) {
    return { expected: money(stream.amount ?? 0), conservative: money(stream.amount ?? 0), maximum: money(stream.amount ?? 0), complete };
  }
  return { expected: money(result.expected), conservative: money(result.conservative), maximum: money(result.max), complete };
}

export function buildBudget(input: {
  month: string; now: Date; streams: IncomeStream[]; receipts: Income[]; overrides: PaymentEvent[];
  knownLinkedIncomeIds?: number[];
  financialRevision: string;
  cash: { cashAmount: Prisma.Decimal; cashConfirmedAt: Date; financialRevision: string; version: number } | null;
}) {
  const { month, now, streams, receipts, overrides, cash } = input;
  const { start, end } = monthBounds(month);
  const closed = now >= end;
  const current = wibDateKey(now).slice(0, 7) === month;
  const cutoff = new Date(Math.min(now.getTime(), start.getTime()));
  const reasons: string[] = [];
  const events: PaymentEvent[] = [];
  const byKey = new Map(overrides.map(e => [e.eventKey, e]));
  const incompleteStreams: { id: number; name: string; reason: string }[] = [];
  for (const stream of streams.filter(s => s.isActive)) {
    const dates = paymentDates(month, stream);
    if (dates === null) { incompleteStreams.push({ id: stream.id, name: stream.name, reason: 'MISSING_PAYDAY' }); continue; }
    if (!dates.length) continue;
    const { complete: estimateComplete, ...amounts } = estimateStream(stream, receipts, cutoff);
    if (!estimateComplete) { incompleteStreams.push({ id: stream.id, name: stream.name, reason: 'MISSING_FORECAST_INPUT' }); continue; }
    for (const date of dates) {
      const eventKey = `stream-${stream.id}-${date}`;
      events.push(byKey.get(eventKey) ?? { eventKey, originalMonth: month, scheduledDate: date, streamId: stream.id, streamName: stream.name, ...amounts, status: 'SCHEDULED', version: 0, reason: '', links: [] });
      byKey.delete(eventKey);
    }
  }
  events.push(...byKey.values());
  const receiptMap = new Map(receipts.map(r => [r.id, r]));
  const linkedIds = new Set([...events.flatMap(e => e.links.map(l => l.incomeId)), ...(input.knownLinkedIncomeIds ?? [])]);
  const actualRows = receipts.filter(r => r.status === 'CONFIRMED' && r.receivedAt >= start && r.receivedAt < end && r.receivedAt <= now);
  const actual = actualRows.reduce((sum, r) => sum.plus(r.amount), new D(0));
  let expected = actual, conservative = actual, maximum = actual;
  if (!closed) reasons.push(...incompleteStreams.map(s => s.reason));
  const enriched = events.filter(e => e.scheduledDate.startsWith(month)).map(event => {
    let status = event.status;
    const invalidLink = event.links.some(l => !receiptMap.has(l.incomeId) || receiptMap.get(l.incomeId)!.status !== 'CONFIRMED' || receiptRevision(receiptMap.get(l.incomeId)!) !== l.receiptRevision);
    const missingStream = !streams.some(s => s.id === event.streamId && s.isActive);
    const unlinked = actualRows.some(r => r.streamId === event.streamId && !linkedIds.has(r.id));
    const received = event.links.reduce((sum, l) => {
      const r = receiptMap.get(l.incomeId);
      return r?.status === 'CONFIRMED' && r.receivedAt <= now ? sum.plus(r.amount) : sum;
    }, new D(0));
    const terminal = ['COMPLETED', 'CANCELLED', 'MISSED'].includes(status);
    if (closed && !terminal) status = 'MISSED';
    else if (invalidLink || (!terminal && (unlinked || missingStream))) status = 'NEEDS_RECONCILIATION';
    else if (!terminal && received.gt(0)) status = received.gte(event.expected) ? 'COMPLETED' : 'PARTIAL';
    if (status === 'NEEDS_RECONCILIATION') reasons.push(invalidLink ? 'RECEIPT_CHANGED' : missingStream ? 'STREAM_CHANGED' : 'UNLINKED_RECEIPT');
    const open = !closed && !['COMPLETED', 'CANCELLED', 'MISSED'].includes(status);
    if (open) {
      expected = expected.plus(D.max(0, new D(event.expected).minus(received)));
      conservative = conservative.plus(D.max(0, new D(event.conservative).minus(received)));
      maximum = maximum.plus(D.max(0, new D(event.maximum).minus(received)));
    }
    // Confirmed receipts with no stream may belong to any event: require explicit linking below.
    return { ...event, status, received: money(received), incomeIds: event.links.map(l => l.incomeId), reasonCodes: invalidLink ? ['RECEIPT_CHANGED'] : (!terminal && unlinked && !closed ? ['UNLINKED_RECEIPT'] : []) };
  }).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.eventKey.localeCompare(b.eventKey));
  if (!closed && enriched.some(e => ['SCHEDULED', 'PARTIAL', 'NEEDS_RECONCILIATION'].includes(e.status)) && actualRows.some(r => r.streamId == null && !linkedIds.has(r.id))) reasons.push('UNCLASSIFIED_RECEIPT');
  const complete = reasons.length === 0;
  const cashValid = current && cash != null && cash.financialRevision === input.financialRevision;
  const actualQuota = actual.times('0.2').toDecimalPlaces(2, D.ROUND_HALF_UP);
  const status = !current ? (closed ? 'CLOSED_MONTH' : 'PLAN_ONLY') : !cash ? 'NEEDS_CASH_CONFIRMATION' : !cashValid ? 'STALE_CASH_CONFIRMATION' : 'BUDGET_READY';
  return {
    month, currency: 'IDR', ruleset: INVEST_RULESET, asOf: now.toISOString(), status,
    actualIncome: money(actual), expectedIncome: complete ? money(expected) : null,
    actualQuota: money(actualQuota), plannedQuota: complete ? money(expected.times('0.2')) : null,
    scenarios: { conservative: complete ? money(conservative) : null, maximum: complete ? money(maximum) : null },
    forecastStatus: complete ? 'COMPLETE' : 'NEEDS_RECONCILIATION', reasonCodes: [...new Set(reasons)], incompleteStreams,
    cashConfirmation: cash ? { amount: money(cash.cashAmount), asOf: cash.cashConfirmedAt.toISOString(), version: cash.version, valid: cashValid } : null,
    freeCash: cashValid ? money(cash!.cashAmount) : null,
    // Source-only base; InvestService overlays the authoritative ledger and reservations atomically.
    usedQuota: '0.00', reservations: '0.00', remainingQuota: money(actualQuota),
    availableToAllocate: cashValid ? money(D.min(actualQuota, cash!.cashAmount)) : null,
    canEvaluate: false, capability: 'MONTHLY_BUDGET',
    events: enriched.map(({ links, ...e }) => e),
    receiptCount: actualRows.length,
    receipts: actualRows.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime() || a.id - b.id).slice(0, 200).map(r => ({ id: r.id, amount: money(r.amount), description: r.description, receivedAt: r.receivedAt.toISOString(), streamId: r.streamId, linked: linkedIds.has(r.id) })),
  };
}
