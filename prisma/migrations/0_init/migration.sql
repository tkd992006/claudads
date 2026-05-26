-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "CtaType" AS ENUM ('LINK', 'PROMPT_INJECTION');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('IMPRESSION', 'CTA', 'REFERRAL', 'REFERRAL_COMMISSION', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AdvLedgerReason" AS ENUM ('CHARGE', 'IMPRESSION', 'CTA', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "inviterId" TEXT,
    "referralEndsAt" TIMESTAMP(3),
    "balanceMicro" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertiserAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdvertiserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertiserLedger" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "reason" "AdvLedgerReason" NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvertiserLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "videoKey" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "ctaType" "CtaType" NOT NULL DEFAULT 'LINK',
    "ctaPrompt" TEXT,
    "cpmCents" INTEGER NOT NULL,
    "budgetCapCents" INTEGER NOT NULL,
    "spentCents" INTEGER NOT NULL DEFAULT 0,
    "impressionsCount" INTEGER NOT NULL DEFAULT 0,
    "dailyCapImpressions" INTEGER,
    "scheduleStart" TIMESTAMP(3),
    "scheduleEnd" TIMESTAMP(3),
    "status" "AdStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Impression" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "ctaClickedAt" TIMESTAMP(3),
    "deviceId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,

    CONSTRAINT "Impression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaMicro" BIGINT NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMicro" BIGINT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
    "destination" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "AdvertiserAccount_userId_key" ON "AdvertiserAccount"("userId");

-- CreateIndex
CREATE INDEX "AdvertiserLedger_advertiserId_createdAt_idx" ON "AdvertiserLedger"("advertiserId", "createdAt");

-- CreateIndex
CREATE INDEX "Ad_status_idx" ON "Ad"("status");

-- CreateIndex
CREATE INDEX "Ad_advertiserId_idx" ON "Ad"("advertiserId");

-- CreateIndex
CREATE INDEX "Impression_userId_startedAt_idx" ON "Impression"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Impression_adId_startedAt_idx" ON "Impression"("adId", "startedAt");

-- CreateIndex
CREATE INDEX "TokenLedger_userId_createdAt_idx" ON "TokenLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_inviteeId_key" ON "Referral"("inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_deviceCode_key" ON "DeviceSession"("deviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_userCode_key" ON "DeviceSession"("userCode");

-- CreateIndex
CREATE INDEX "DeviceSession_userCode_idx" ON "DeviceSession"("userCode");

-- AddForeignKey
ALTER TABLE "AdvertiserAccount" ADD CONSTRAINT "AdvertiserAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertiserLedger" ADD CONSTRAINT "AdvertiserLedger_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "AdvertiserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "AdvertiserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impression" ADD CONSTRAINT "Impression_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impression" ADD CONSTRAINT "Impression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenLedger" ADD CONSTRAINT "TokenLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

