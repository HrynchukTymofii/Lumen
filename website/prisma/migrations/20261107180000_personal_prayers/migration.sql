-- CreateEnum
CREATE TYPE "PrayerSource" AS ENUM ('generator', 'companion', 'manual');

-- CreateEnum
CREATE TYPE "TokenReason" AS ENUM ('purchase', 'spend', 'refund', 'store_refund', 'grant', 'monthly_free');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "prayerTokens" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "prayer" TEXT;

-- CreateTable
CREATE TABLE "PersonalPrayer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "PrayerSource" NOT NULL,
    "need" TEXT,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "refs" JSONB NOT NULL DEFAULT '[]',
    "words" INTEGER NOT NULL,
    "audioKey" TEXT,
    "audioTextHash" TEXT,
    "lines" JSONB,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalPrayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerQuota" (
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrayerQuota_pkey" PRIMARY KEY ("userId","period")
);

-- CreateTable
CREATE TABLE "TokenLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "TokenReason" NOT NULL,
    "transactionId" TEXT,
    "productId" TEXT,
    "prayerId" TEXT,
    "month" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalPrayer_messageId_key" ON "PersonalPrayer"("messageId");

-- CreateIndex
CREATE INDEX "PersonalPrayer_userId_createdAt_idx" ON "PersonalPrayer"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TokenLedger_transactionId_key" ON "TokenLedger"("transactionId");

-- CreateIndex
CREATE INDEX "TokenLedger_userId_createdAt_idx" ON "TokenLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TokenLedger_userId_reason_month_idx" ON "TokenLedger"("userId", "reason", "month");

-- AddForeignKey
ALTER TABLE "PersonalPrayer" ADD CONSTRAINT "PersonalPrayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenLedger" ADD CONSTRAINT "TokenLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

