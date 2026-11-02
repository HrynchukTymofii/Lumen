-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appBuild" TEXT,
ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "lastPlatform" "Platform",
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AppRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "moment" TEXT NOT NULL,
    "comment" TEXT,
    "platform" "Platform" NOT NULL,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppRating_createdAt_idx" ON "AppRating"("createdAt");

-- AddForeignKey
ALTER TABLE "AppRating" ADD CONSTRAINT "AppRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

