-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'review', 'published', 'archived');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLoginCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "scene" TEXT NOT NULL DEFAULT 'dawn',
    "scriptureRefs" TEXT[],
    "variants" JSONB NOT NULL DEFAULT '[]',
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "publishAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerPath" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "scene" TEXT NOT NULL DEFAULT 'dawn',
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerPathDay" (
    "pathId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "PrayerPathDay_pkey" PRIMARY KEY ("pathId","day")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AdminLoginCode_email_idx" ON "AdminLoginCode"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AudioTrack_slug_key" ON "AudioTrack"("slug");

-- CreateIndex
CREATE INDEX "AudioTrack_status_category_idx" ON "AudioTrack"("status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerPath_slug_key" ON "PrayerPath"("slug");

-- AddForeignKey
ALTER TABLE "PrayerPathDay" ADD CONSTRAINT "PrayerPathDay_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "PrayerPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerPathDay" ADD CONSTRAINT "PrayerPathDay_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "AudioTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
