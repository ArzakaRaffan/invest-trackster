export type PaymentEvent = {
  eventKey: string; scheduledDate: string; streamId: number; streamName: string;
  expected: string; conservative: string; maximum: string; received: string;
  status: string; version: number; reason: string; incomeIds: number[]; reasonCodes: string[];
};
export type Budget = {
  month: string; currency: string; ruleset: string; asOf: string; revision: string; status: string;
  actualIncome: string; expectedIncome: string | null; actualQuota: string; plannedQuota: string | null;
  scenarios: { conservative: string | null; maximum: string | null };
  forecastStatus: string; reasonCodes: string[];
  incompleteStreams: { id: number; name: string; reason: string }[];
  cashConfirmation: { amount: string; asOf: string; version: number; valid: boolean } | null;
  freeCash: string | null; usedQuota: string; goalSavingUsage: string; reservations: string; remainingQuota: string; cashDeficit: string;
  availableToAllocate: string | null; canEvaluate: boolean; events: PaymentEvent[];
  receiptCount: number; receipts: { id: number; amount: string; description: string; receivedAt: string; streamId: number | null; linked: boolean }[];
};
export type InvestStatus = { enabled: boolean; phase: string; ruleset: string; capabilities: Record<string, boolean>; coverage: Record<string, string> };
export const currentMonth = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date());
export const tracksterUrl = process.env.NEXT_PUBLIC_TRACKSTER_URL || 'http://localhost:3000';

export type RiskAnswers = {
  t1?: number; t2?: number; t3?: number; t4?: number;
  essentialExpenseIDR?: string; liquidReserveIDR?: string; lossCapacityIDR?: string;
  incomeStable?: boolean; urgentObligations?: boolean; nearTermNeed?: boolean; hasDeficit?: boolean; expensiveDebt?: boolean;
  k1?: 'TRUE' | 'FALSE' | 'UNSURE'; k2?: 'TRUE' | 'FALSE' | 'UNSURE'; k3?: 'TRUE' | 'FALSE' | 'UNSURE';
  cryptoOptIn?: boolean; cryptoPercent?: string;
};
export type RiskProfile = { id: string; version: number; answers: RiskAnswers; status: string; riskClass: number | null; tolerance: number | null; capacity: number | null; horizon: number | null;
  horizonMonths: number | null; reserveMonths: string | null; lossCapacityIDR: string | null; toleranceLossPercent: number | null;
  knowledge: { diversification: boolean; bonds: boolean; fxCrypto: boolean }; cryptoPercent: string;
  missing: string[]; reasons: string[]; conflicts: string[]; reviewHash: string; conflictsAcknowledged: boolean; confirmedAt: string | null };
export type InvestGoal = { id: string; name: string; version: number; targetAmountIDR: string | null; needDate: string | null; liquidityDays: number | null; status: 'ACTIVE' | 'DRAFT'; holdingsDeclaration: 'UNKNOWN' | 'EMPTY' | 'ENTERED'; profile: RiskProfile | null };
export type Holding = { id: string; goalId: string; label: string; assetClass: string; currency: string; mode: 'UNITS' | 'VALUE'; quantity: string | null; unitPrice: string | null; value: string | null; valueIDR: string | null;
  openingAt: string; valuationAt: string; fxToIDR: string | null; fxAsOf: string | null; costBasisIDR: string | null; valuationNote: string; valuationReasons: string[]; version: number };
export type LedgerEntry = { id: string; goalId: string; holdingId: string | null; type: string; allocationMonth: string; occurredAt: string; principalIDR: string; feeIDR: string; quantityDelta: string; reason: string; reversed: boolean; reversalOfId: string | null; outOfPolicy: boolean; fundingEntryId: string | null };
export type PortfolioState = { revision: string; asOf: string; goals: InvestGoal[]; activeGoalId: string | null; setupComplete: boolean; holdings: Holding[]; ledger: LedgerEntry[]; nextCursor: string | null;
  credits: { id: string; goalId: string; type: string; allocationMonth: string; remainingIDR: string }[];
  reservations: { id: string; goalId: string; amountIDR: string; expiresAt: string; effectiveStatus: string }[]; budget: Budget };
