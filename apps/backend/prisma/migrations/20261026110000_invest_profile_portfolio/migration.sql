-- CreateEnum
CREATE TYPE "InvestGoalStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "InvestAssetClass" AS ENUM ('CASH', 'BONDS', 'EQUITY', 'CRYPTO');

-- CreateEnum
CREATE TYPE "InvestHoldingMode" AS ENUM ('UNITS', 'VALUE');

-- CreateEnum
CREATE TYPE "InvestMovementType" AS ENUM ('PURCHASE', 'SALE', 'DISTRIBUTION', 'GOAL_SAVING', 'QUANTITY_ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "InvestReservationStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'SETTLED');

-- CreateTable
CREATE TABLE "InvestGoal" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "targetAmountIDR" DECIMAL(18,2),
    "needDate" VARCHAR(10),
    "liquidityDays" INTEGER,
    "status" "InvestGoalStatus" NOT NULL DEFAULT 'DRAFT',
    "holdingsDeclaration" VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN',
    "capacityRevision" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestRiskProfile" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "goalVersion" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "ruleset" TEXT NOT NULL,
    "reviewHash" VARCHAR(64) NOT NULL,
    "conflictsAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestHolding" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" TEXT NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "assetClass" "InvestAssetClass" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "mode" "InvestHoldingMode" NOT NULL,
    "openingQuantity" DECIMAL(28,12),
    "openingAt" TIMESTAMP(3) NOT NULL,
    "costBasisIDR" DECIMAL(18,2),
    "unitPrice" DECIMAL(28,12),
    "value" DECIMAL(18,2),
    "valuationAt" TIMESTAMP(3) NOT NULL,
    "fxToIDR" DECIMAL(28,12),
    "fxAsOf" TIMESTAMP(3),
    "valuationNote" VARCHAR(300) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestLedger" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" TEXT NOT NULL,
    "holdingId" TEXT,
    "type" "InvestMovementType" NOT NULL,
    "allocationMonth" VARCHAR(7) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "principalIDR" DECIMAL(18,2) NOT NULL,
    "feeIDR" DECIMAL(18,2) NOT NULL,
    "quantityDelta" DECIMAL(28,12) NOT NULL,
    "quotaDelta" DECIMAL(18,2) NOT NULL,
    "goalSavingDelta" DECIMAL(18,2) NOT NULL,
    "freeCashDelta" DECIMAL(18,2) NOT NULL,
    "investmentCashDelta" DECIMAL(18,2) NOT NULL,
    "fundingEntryId" TEXT,
    "reversalOfId" TEXT,
    "receiptTransactionId" INTEGER,
    "receiptIncomeId" INTEGER,
    "outOfPolicy" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestReservation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" TEXT NOT NULL,
    "allocationMonth" VARCHAR(7) NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "inputRevision" VARCHAR(64) NOT NULL,
    "amountIDR" DECIMAL(18,2) NOT NULL,
    "status" "InvestReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestMutation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "route" VARCHAR(150) NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "bodyHash" VARCHAR(64) NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestChange" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestGoal_userId_status_idx" ON "InvestGoal"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InvestGoal_id_userId_key" ON "InvestGoal"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestRiskProfile_userId_goalId_version_key" ON "InvestRiskProfile"("userId", "goalId", "version");

-- CreateIndex
CREATE INDEX "InvestHolding_userId_goalId_idx" ON "InvestHolding"("userId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestHolding_id_userId_key" ON "InvestHolding"("id", "userId");

-- CreateIndex
CREATE INDEX "InvestLedger_userId_allocationMonth_idx" ON "InvestLedger"("userId", "allocationMonth");

-- CreateIndex
CREATE INDEX "InvestLedger_userId_goalId_createdAt_idx" ON "InvestLedger"("userId", "goalId", "createdAt");

-- CreateIndex
CREATE INDEX "InvestLedger_userId_holdingId_idx" ON "InvestLedger"("userId", "holdingId");

-- CreateIndex
CREATE INDEX "InvestLedger_userId_fundingEntryId_idx" ON "InvestLedger"("userId", "fundingEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestLedger_userId_reversalOfId_key" ON "InvestLedger"("userId", "reversalOfId");

-- CreateIndex
CREATE INDEX "InvestReservation_userId_allocationMonth_status_idx" ON "InvestReservation"("userId", "allocationMonth", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InvestMutation_userId_route_key_key" ON "InvestMutation"("userId", "route", "key");

-- CreateIndex
CREATE INDEX "InvestChange_userId_entityId_createdAt_idx" ON "InvestChange"("userId", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "InvestGoal" ADD CONSTRAINT "InvestGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestRiskProfile" ADD CONSTRAINT "InvestRiskProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestRiskProfile" ADD CONSTRAINT "InvestRiskProfile_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "InvestGoal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestHolding" ADD CONSTRAINT "InvestHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestHolding" ADD CONSTRAINT "InvestHolding_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "InvestGoal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestLedger" ADD CONSTRAINT "InvestLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestLedger" ADD CONSTRAINT "InvestLedger_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "InvestGoal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestLedger" ADD CONSTRAINT "InvestLedger_holdingId_userId_fkey" FOREIGN KEY ("holdingId", "userId") REFERENCES "InvestHolding"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestReservation" ADD CONSTRAINT "InvestReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestReservation" ADD CONSTRAINT "InvestReservation_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "InvestGoal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestMutation" ADD CONSTRAINT "InvestMutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestChange" ADD CONSTRAINT "InvestChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- A user can have multiple draft goals, but exactly zero or one active goal.
ALTER TABLE "InvestMonth" ADD COLUMN "cashLedgerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- Service switches the previous active goal inside the same Serializable transaction.
CREATE UNIQUE INDEX "InvestGoal_one_active_per_user" ON "InvestGoal" ("userId") WHERE "status" = 'ACTIVE';
ALTER TABLE "InvestHolding" ADD CONSTRAINT "InvestHolding_opening_nonnegative" CHECK ("openingQuantity" IS NULL OR "openingQuantity" >= 0);
ALTER TABLE "InvestReservation" ADD CONSTRAINT "InvestReservation_positive_amount" CHECK ("amountIDR" > 0);
ALTER TABLE "InvestReservation" ADD CONSTRAINT "InvestReservation_max_24h" CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + INTERVAL '24 hours');
