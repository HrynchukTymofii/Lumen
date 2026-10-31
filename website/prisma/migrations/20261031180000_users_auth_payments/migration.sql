-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ios', 'android', 'web');

-- CreateEnum
CREATE TYPE "Denomination" AS ENUM ('catholic', 'protestant', 'orthodox', 'not_sure', 'exploring');

-- CreateEnum
CREATE TYPE "Translation" AS ENUM ('WEB', 'KJV', 'DRA');

-- CreateEnum
CREATE TYPE "AiComfort" AS ENUM ('comfortable', 'unsure', 'background');

-- CreateEnum
CREATE TYPE "PaywallVariant" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "LoginTokenPurpose" AS ENUM ('email_code', 'web_to_app');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('stripe', 'app_store', 'play');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('trial', 'active', 'grace', 'canceled', 'expired');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "aiComfort" "AiComfort",
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "appleSub" TEXT,
ADD COLUMN     "burden" INTEGER,
ADD COLUMN     "denomination" "Denomination",
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "funnelSlug" TEXT,
ADD COLUMN     "googleSub" TEXT,
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "obstacles" TEXT[],
ADD COLUMN     "paywallVariant" "PaywallVariant",
ADD COLUMN     "prayerFrequency" TEXT,
ADD COLUMN     "prayerTime" TEXT,
ADD COLUMN     "sensitiveConsentAt" TIMESTAMP(3),
ADD COLUMN     "signupPlatform" "Platform",
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "struggles" TEXT[],
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
ADD COLUMN     "translation" "Translation" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmTerm" TEXT,
ADD COLUMN     "weeklyGoal" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "purpose" "LoginTokenPurpose" NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "EntitlementSource" NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" "EntitlementStatus" NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_email_idx" ON "LoginToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_externalId_key" ON "Entitlement"("externalId");

-- CreateIndex
CREATE INDEX "Entitlement_userId_idx" ON "Entitlement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleSub_key" ON "User"("appleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
