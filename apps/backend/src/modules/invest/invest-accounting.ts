import { InvestLedger, InvestReservation, Prisma } from '@prisma/client';
import { InvestDecimal, money } from './invest-budget';

const D = InvestDecimal;
export function accountBudget(input: {
  month: string; now: Date; actualQuota: string;
  cash: { amount: string; asOf: string; valid: boolean } | null;
  confirmedLedgerIds?: string[];
  ledger: InvestLedger[]; reservations: InvestReservation[];
}) {
  const sum = (rows: InvestLedger[], key: 'quotaDelta' | 'goalSavingDelta' | 'freeCashDelta') => rows.reduce((s, r) => s.plus(r[key]), new D(0));
  const monthly = input.ledger.filter(l => l.allocationMonth === input.month);
  const used = sum(monthly, 'quotaDelta'), savings = sum(monthly, 'goalSavingDelta');
  const active = input.reservations.filter(r => r.status === 'ACTIVE' && r.expiresAt > input.now);
  const reservedMonth = active.filter(r => r.allocationMonth === input.month).reduce((s, r) => s.plus(r.amountIDR), new D(0));
  const reservedCash = active.reduce((s, r) => s.plus(r.amountIDR), new D(0));
  const remaining = new D(input.actualQuota).minus(used).minus(savings).minus(reservedMonth);
  const asOf = input.cash ? new Date(input.cash.asOf) : null;
  // New records effective before a confirmation (including corrections) require a new confirmation.
  const included = input.confirmedLedgerIds == null ? null : new Set(input.confirmedLedgerIds);
  const newer = asOf ? input.ledger.filter(l => (included ? !included.has(l.id) : l.createdAt > asOf) && !l.freeCashDelta.isZero()) : [];
  const backdated = newer.some(l => l.occurredAt <= asOf!);
  const free = input.cash?.valid && !backdated ? new D(input.cash.amount).plus(sum(newer, 'freeCashDelta')).minus(reservedCash) : null;
  const overcommitted = remaining.lt(0) || (free != null && free.lt(0));
  return { usedQuota: money(used), goalSavingUsage: money(savings), reservations: money(reservedMonth), reservedCash: money(reservedCash),
    remainingQuota: money(remaining), freeCash: free == null ? null : money(D.max(0, free)),
    cashDeficit: free != null && free.lt(0) ? money(free.neg()) : '0.00',
    availableToAllocate: overcommitted ? '0.00' : free == null ? null : money(D.min(D.max(0, remaining), D.max(0, free))),
    overcommitted, cashBackdated: backdated };
}

export function holdingQuantity(opening: Prisma.Decimal | null, ledger: Pick<InvestLedger, 'quantityDelta'>[]) {
  return ledger.reduce((n, l) => n.plus(l.quantityDelta), new D(opening ?? 0));
}

/** The origin credit remains attached when an entry is reversed, so it cannot be spent twice. */
export function creditBalance(credit: Pick<InvestLedger, 'id' | 'investmentCashDelta'>, ledger: Pick<InvestLedger, 'fundingEntryId' | 'reversalOfId' | 'investmentCashDelta'>[]) {
  return ledger.filter(l => l.fundingEntryId === credit.id || l.reversalOfId === credit.id)
    .reduce((n, l) => n.plus(l.investmentCashDelta), new D(credit.investmentCashDelta));
}
