-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reminderTime" TEXT,
ADD COLUMN     "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "streakHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PrayerCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "prayerId" TEXT,
    "isGrace" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrayerCompletion_userId_date_key" ON "PrayerCompletion"("userId", "date");

-- AddForeignKey
ALTER TABLE "PrayerCompletion" ADD CONSTRAINT "PrayerCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
