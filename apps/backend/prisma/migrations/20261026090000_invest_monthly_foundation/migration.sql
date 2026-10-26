-- CreateEnum
CREATE TYPE "InvestPaymentStatus" AS ENUM ('SCHEDULED', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'MISSED', 'NEEDS_RECONCILIATION');

-- CreateTable
CREATE TABLE "InvestMonth" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cashAmount" DECIMAL(18,2) NOT NULL,
    "cashConfirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financialRevision" VARCHAR(64) NOT NULL,

    CONSTRAINT "InvestMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestPaymentEvent" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventKey" VARCHAR(100) NOT NULL,
    "originalMonth" VARCHAR(7) NOT NULL,
    "scheduledDate" VARCHAR(10) NOT NULL,
    "streamId" INTEGER NOT NULL,
    "streamName" TEXT NOT NULL,
    "expected" DECIMAL(18,2) NOT NULL,
    "conservative" DECIMAL(18,2) NOT NULL,
    "maximum" DECIMAL(18,2) NOT NULL,
    "status" "InvestPaymentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestPaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestReceiptLink" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "incomeId" INTEGER NOT NULL,
    "receiptRevision" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestReceiptLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestEventAudit" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventKey" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestEventAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestMonth_userId_month_key" ON "InvestMonth"("userId", "month");

-- CreateIndex
CREATE INDEX "InvestPaymentEvent_userId_originalMonth_idx" ON "InvestPaymentEvent"("userId", "originalMonth");

-- CreateIndex
CREATE INDEX "InvestPaymentEvent_userId_scheduledDate_idx" ON "InvestPaymentEvent"("userId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "InvestPaymentEvent_userId_eventKey_key" ON "InvestPaymentEvent"("userId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "InvestPaymentEvent_id_userId_key" ON "InvestPaymentEvent"("id", "userId");

-- CreateIndex
CREATE INDEX "InvestReceiptLink_userId_eventId_idx" ON "InvestReceiptLink"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestReceiptLink_userId_incomeId_key" ON "InvestReceiptLink"("userId", "incomeId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestEventAudit_userId_eventKey_version_key" ON "InvestEventAudit"("userId", "eventKey", "version");

-- AddForeignKey
ALTER TABLE "InvestMonth" ADD CONSTRAINT "InvestMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestPaymentEvent" ADD CONSTRAINT "InvestPaymentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestReceiptLink" ADD CONSTRAINT "InvestReceiptLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestReceiptLink" ADD CONSTRAINT "InvestReceiptLink_eventId_userId_fkey" FOREIGN KEY ("eventId", "userId") REFERENCES "InvestPaymentEvent"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestEventAudit" ADD CONSTRAINT "InvestEventAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

