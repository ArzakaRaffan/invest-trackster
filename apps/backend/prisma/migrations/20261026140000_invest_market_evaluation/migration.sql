-- AlterTable
ALTER TABLE "InvestHolding" ADD COLUMN     "instrumentId" TEXT;

-- AlterTable
ALTER TABLE "InvestReservation" ADD COLUMN     "plan" JSONB,
ADD COLUMN     "settledLedgerIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "InvestInstrument" (
    "id" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "facts" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestCatalogRevision" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "facts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestCatalogRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestInstrumentAccess" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "instrumentId" VARCHAR(80) NOT NULL,
    "instrumentVersion" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "understood" BOOLEAN NOT NULL,
    "acceptsLock" BOOLEAN NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestInstrumentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestEvaluation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" TEXT NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "mode" VARCHAR(10) NOT NULL,
    "ruleset" TEXT NOT NULL,
    "inputRevision" VARCHAR(64) NOT NULL,
    "financialRevision" VARCHAR(64) NOT NULL,
    "catalogRevision" VARCHAR(64) NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestCatalogRevision_userId_instrumentId_idx" ON "InvestCatalogRevision"("userId", "instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestCatalogRevision_instrumentId_version_key" ON "InvestCatalogRevision"("instrumentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "InvestInstrumentAccess_userId_instrumentId_key" ON "InvestInstrumentAccess"("userId", "instrumentId");

-- CreateIndex
CREATE INDEX "InvestEvaluation_userId_createdAt_id_idx" ON "InvestEvaluation"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "InvestEvaluation_id_userId_key" ON "InvestEvaluation"("id", "userId");

-- AddForeignKey
ALTER TABLE "InvestCatalogRevision" ADD CONSTRAINT "InvestCatalogRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestCatalogRevision" ADD CONSTRAINT "InvestCatalogRevision_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InvestInstrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestInstrumentAccess" ADD CONSTRAINT "InvestInstrumentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestEvaluation" ADD CONSTRAINT "InvestEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestEvaluation" ADD CONSTRAINT "InvestEvaluation_goalId_userId_fkey" FOREIGN KEY ("goalId", "userId") REFERENCES "InvestGoal"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
